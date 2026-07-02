// All game audio is synthesized with the Web Audio API — zero asset files,
// zero licensing risk. One lazily-created AudioContext, per-voice gain
// envelopes, a master gain + compressor, polyphony cap, and throttling for
// rapid-fire sounds. The context unlocks on the first user gesture
// (pointerdown/keydown) to satisfy autoplay policies.

export type SfxName =
  | "uiClick"
  | "move"
  | "rotate"
  | "softDrop"
  | "hardDrop"
  | "lock"
  | "clear1"
  | "clear2"
  | "clear3"
  | "clear4"
  | "b2b"
  | "levelUp"
  | "hold"
  | "holdBlocked"
  | "countdownTick"
  | "countdownGo"
  | "pause"
  | "resume"
  | "gameOver";

const MIN_GAIN = 0.0001;
const MAX_VOICES = 12;
const THROTTLE_MS = 30;

export class SfxPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private volume = 70;
  private muted = false;
  private liveVoices = 0;
  private lastPlayed = new Map<string, number>();
  private detachUnlock: (() => void) | null = null;

  /** Register one-time gesture listeners that create/resume the context. */
  installUnlockListeners(): void {
    if (this.detachUnlock) return;
    const unlock = () => {
      this.ensureContext();
      this.ctx?.resume().catch(() => {});
      detach();
    };
    const detach = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      this.detachUnlock = null;
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    this.detachUnlock = detach;
  }

  dispose(): void {
    this.detachUnlock?.();
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  /** volume 0–100; perceptual mapping (v/100)^2 * 0.9 */
  setVolume(volume: number, muted: boolean): void {
    this.volume = volume;
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(this.masterGain(), this.ctx.currentTime);
    }
  }

  private masterGain(): number {
    return this.muted ? 0 : Math.pow(this.volume / 100, 2) * 0.9;
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined" || !("AudioContext" in window)) {
      return null;
    }
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = this.masterGain();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;

    // pre-rendered 1s white-noise buffer, reused by every noise voice
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return ctx;
  }

  play(name: SfxName, arg = 0): void {
    if (this.muted || this.volume === 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master || ctx.state !== "running") return;

    if (name === "move" || name === "softDrop") {
      const now = performance.now();
      const last = this.lastPlayed.get(name) ?? 0;
      if (now - last < THROTTLE_MS) return;
      this.lastPlayed.set(name, now);
    }
    if (this.liveVoices >= MAX_VOICES) return;

    const t = ctx.currentTime;
    switch (name) {
      case "uiClick":
        this.tone("square", 1200, 1200, 0.1, t, 0.03);
        break;
      case "move":
        this.tone("triangle", 220, 220, 0.1, t, 0.03);
        break;
      case "rotate":
        this.tone("triangle", 300, 420, 0.12, t, 0.06, 0.04);
        break;
      case "softDrop":
        this.tone("sine", 180, 180, 0.07, t, 0.02);
        break;
      case "hardDrop":
        this.tone("sine", 150, 45, 0.45, t, 0.12, 0.09);
        this.noise(0.25, t, 0.07, { type: "lowpass", freq: 500 });
        break;
      case "lock":
        this.tone("triangle", 90, 90, 0.2, t, 0.05);
        this.noise(0.08, t, 0.015, { type: "highpass", freq: 2000 });
        break;
      case "clear1":
        this.arpeggio("triangle", [523, 659], 0.055, 0.22, t);
        break;
      case "clear2":
        this.arpeggio("triangle", [523, 659, 784], 0.055, 0.22, t);
        break;
      case "clear3":
        this.arpeggio("triangle", [523, 659, 784, 1047], 0.05, 0.22, t);
        this.arpeggio("sawtooth", [523, 659, 784, 1047], 0.05, 0.08, t);
        break;
      case "clear4": {
        // the "SIRTET!" fanfare
        const notes = [523, 659, 784, 1047, 1319, 1568];
        this.arpeggio("sawtooth", notes, 0.045, 0.2, t, {
          type: "lowpass",
          freq: 3000,
        });
        this.tone("sine", 65, 65, 0.3, t, 0.45, 0, 0.05);
        this.noise(0.06, t + 0.1, 0.3, { type: "bandpass", freq: 4000 });
        if (arg > 0) this.comboStair(arg, t + 0.25);
        break;
      }
      case "b2b":
        this.arpeggio("sawtooth", [784, 1175], 0.07, 0.18, t);
        break;
      case "levelUp": {
        const voice = this.voice(0.25, t, 0.5);
        if (!voice) break;
        const osc = voice.ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);
        const filter = voice.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.exponentialRampToValueAtTime(4000, t + 0.35);
        osc.connect(filter);
        filter.connect(voice.gain);
        osc.start(t);
        osc.stop(t + 0.5);
        this.tone("sine", 880, 880, 0.12, t + 0.32, 0.2);
        break;
      }
      case "hold":
        this.tone("sine", 520, 370, 0.15, t, 0.08, 0.08);
        break;
      case "holdBlocked":
        this.tone("square", 110, 110, 0.12, t, 0.04);
        this.tone("square", 98, 98, 0.12, t + 0.06, 0.04);
        break;
      case "countdownTick":
        this.tone("sine", 660, 660, 0.18, t, 0.08);
        break;
      case "countdownGo":
        this.tone("sine", 880, 880, 0.22, t, 0.15);
        break;
      case "pause":
        this.tone("sine", 500, 300, 0.15, t, 0.1, 0.1);
        break;
      case "resume":
        this.tone("sine", 300, 500, 0.15, t, 0.1, 0.1);
        break;
      case "gameOver": {
        const phrase = [440, 349, 294, 220];
        phrase.forEach((freq, i) => {
          const start = t + i * 0.16;
          const dur = i === phrase.length - 1 ? 0.5 : 0.16;
          this.tone("triangle", freq, freq, 0.2, start, dur);
        });
        break;
      }
    }
  }

  /** combo x n: semitone stair on top of the clear sound */
  playCombo(combo: number): void {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== "running" || this.muted) return;
    this.comboStair(combo, ctx.currentTime);
  }

  private comboStair(combo: number, t: number): void {
    const n = Math.min(combo, 10);
    const freq = 660 * Math.pow(2, (n - 1) / 12);
    this.tone("square", freq, freq, 0.15, t, 0.08);
  }

  // ---------- synthesis primitives ----------

  private voice(
    peakGain: number,
    start: number,
    duration: number,
    attack = 0.001,
  ): { ctx: AudioContext; gain: GainNode } | null {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return null;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(MIN_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(peakGain, MIN_GAIN), start + attack);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration);
    gain.connect(master);
    this.liveVoices++;
    setTimeout(
      () => {
        this.liveVoices = Math.max(0, this.liveVoices - 1);
        gain.disconnect();
      },
      (start - ctx.currentTime + duration) * 1000 + 100,
    );
    return { ctx, gain };
  }

  private tone(
    type: OscillatorType,
    freqFrom: number,
    freqTo: number,
    peakGain: number,
    start: number,
    duration: number,
    rampTime = 0,
    attack = 0.001,
  ): void {
    const voice = this.voice(peakGain, start, duration, attack);
    if (!voice) return;
    const osc = voice.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, start);
    if (freqTo !== freqFrom) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(freqTo, 1),
        start + (rampTime || duration),
      );
    }
    osc.connect(voice.gain);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noise(
    peakGain: number,
    start: number,
    duration: number,
    filter?: { type: BiquadFilterType; freq: number },
  ): void {
    if (!this.noiseBuffer) return;
    const voice = this.voice(peakGain, start, duration);
    if (!voice) return;
    const src = voice.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    if (filter) {
      const biquad = voice.ctx.createBiquadFilter();
      biquad.type = filter.type;
      biquad.frequency.value = filter.freq;
      if (filter.type === "bandpass") biquad.Q.value = 1;
      src.connect(biquad);
      biquad.connect(voice.gain);
    } else {
      src.connect(voice.gain);
    }
    src.start(start);
    src.stop(start + duration + 0.05);
  }

  private arpeggio(
    type: OscillatorType,
    freqs: number[],
    noteDuration: number,
    peakGain: number,
    start: number,
    filter?: { type: BiquadFilterType; freq: number },
  ): void {
    freqs.forEach((freq, i) => {
      const noteStart = start + i * noteDuration;
      if (filter) {
        const voice = this.voice(peakGain, noteStart, noteDuration * 1.6);
        if (!voice) return;
        const osc = voice.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const biquad = voice.ctx.createBiquadFilter();
        biquad.type = filter.type;
        biquad.frequency.value = filter.freq;
        osc.connect(biquad);
        biquad.connect(voice.gain);
        osc.start(noteStart);
        osc.stop(noteStart + noteDuration * 1.6 + 0.05);
      } else {
        this.tone(type, freq, freq, peakGain, noteStart, noteDuration * 1.6);
      }
    });
  }
}
