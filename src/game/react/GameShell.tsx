"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Engine } from "@/game/core/engine";
import { MODES } from "@/game/core/modes";
import { ReplayRecorder } from "@/game/core/replay";
import type { Seed } from "@/game/core/rng";
import type {
  EngineSnapshot,
  FinalStats,
  InputAction,
  ModeId,
} from "@/game/core/types";
import { KeyboardInput } from "@/game/input/keyboard";
import { GameLoop } from "@/game/loop";
import { SfxPlayer, type SfxName } from "@/game/audio/sfx";
import { FxEngine } from "@/game/render/fx";
import { Renderer, pieceColor } from "@/game/render/renderer";
import { useSettings } from "@/lib/settings/SettingsProvider";
import { loadLocalBest, prefersReducedMotion, recordLocalBest } from "@/lib/settings/store";
import { resolveTheme, type ThemeTokens } from "@/lib/theme/themes";
import { startGameSession, submitScore } from "@/lib/scores/client";
import { HoldBox, Hud, NextQueue, SrScore, TouchControls } from "./components";
import {
  CountdownOverlay,
  GameOverOverlay,
  PauseOverlay,
  StartOverlay,
  TutorialOverlay,
  type SubmitState,
} from "./overlays";

type Phase = "menu" | "countdown" | "playing" | "paused" | "gameover";

interface Popup {
  id: number;
  text: string;
}

interface GameResult {
  stats: FinalStats;
  submitState: SubmitState;
  isLocalBest: boolean;
}

const MS_PER_TICK = 1000 / 60;
const msToTicks = (ms: number) => Math.max(0, Math.round(ms / MS_PER_TICK));

let popupId = 0;

export default function GameShell() {
  const { settings, ready, userId, update } = useSettings();

  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<ModeId>("marathon");
  const [startLevel, setStartLevel] = useState(1);
  const [snap, setSnap] = useState<EngineSnapshot | null>(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [result, setResult] = useState<GameResult | null>(null);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [boardSize, setBoardSize] = useState({ w: 240, h: 480 });

  const engineRef = useRef<Engine | null>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const keyboardRef = useRef<KeyboardInput | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const fxRef = useRef<FxEngine | null>(null);
  const sfxRef = useRef<SfxPlayer | null>(null);
  const recorderRef = useRef<ReplayRecorder | null>(null);
  const tokenRef = useRef<string | null>(null);
  const pendingDropRef = useRef(0);
  const tokensRef = useRef<ThemeTokens | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const boardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pieceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const clearTimers = () => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const pushPopup = useCallback((text: string) => {
    const id = ++popupId;
    setPopups((p) => [...p.slice(-3), { id, text }]);
    setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 900);
  }, []);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    keyboardRef.current?.setEnabled(false);
    loopRef.current?.setPaused(true);
    sfxRef.current?.play("pause");
    setPhase("paused");
  }, []);

  // ---------- one-time infrastructure (StrictMode-safe: full teardown) ----------
  useEffect(() => {
    const sfx = new SfxPlayer();
    sfx.installUnlockListeners();
    sfxRef.current = sfx;

    const fx = new FxEngine();
    fxRef.current = fx;

    const keyboard = new KeyboardInput();
    keyboardRef.current = keyboard;
    const detachKeyboard = keyboard.attach(window);

    const renderer = new Renderer(
      boardCanvasRef.current!,
      pieceCanvasRef.current!,
      fxCanvasRef.current!,
    );
    rendererRef.current = renderer;

    const loop = new GameLoop({
      tick: () => {
        const engine = engineRef.current;
        if (!engine) return;
        const actions = keyboard.drain();
        if (actions.length > 0 && recorderRef.current) {
          const t = engine.snapshot().ticks;
          for (const action of actions) recorderRef.current.record(t, action);
        }
        engine.tick(actions);
      },
      render: () => {
        const engine = engineRef.current;
        const now = performance.now();
        if (engine) {
          const snapshot = engine.snapshot();
          renderer.draw(snapshot, fx, now);
          setSnap(snapshot); // version-cached: same ref = no re-render
        }
        const offset = fx.shakeOffset(now);
        if (boardWrapRef.current) {
          boardWrapRef.current.style.transform =
            offset.x || offset.y
              ? `translate(${offset.x}px, ${offset.y}px)`
              : "";
        }
      },
    });
    loopRef.current = loop;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const size = renderer.resize(width, height);
      setBoardSize({ w: size.w, h: size.h });
    });
    if (containerRef.current) observer.observe(containerRef.current);

    const onVisibility = () => {
      if (document.hidden && phaseRef.current === "playing") {
        pauseGame();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onVisibility);

    return () => {
      clearTimers();
      loop.stop();
      detachKeyboard();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onVisibility);
      sfx.dispose();
      engineRef.current = null;
    };
  }, [pauseGame]);

  // ---------- settings -> subsystems ----------
  useEffect(() => {
    if (!ready) return;
    sfxRef.current?.setVolume(settings.audio.master, settings.audio.muted);
    const shakeAllowed =
      !prefersReducedMotion() || settings.effects.allowMotionOverride;
    fxRef.current?.configure(settings.effects.intensity, shakeAllowed);
    keyboardRef.current?.setBindings(settings.keyBindings);
    rendererRef.current?.setGhostEnabled(settings.gameplay.ghost);
    engineRef.current?.applyConfig({
      dasTicks: msToTicks(settings.gameplay.das),
      arrTicks: msToTicks(settings.gameplay.arr),
      ghost: settings.gameplay.ghost,
    });
  }, [ready, settings]);

  useEffect(() => {
    if (!ready) return;
    const tokens = resolveTheme(
      settings.theme.mode,
      settings.theme.presetId,
      settings.theme.customTokens,
    );
    tokensRef.current = tokens;
    rendererRef.current?.setTheme(tokens);
    fxRef.current?.setColors(tokens.glow, tokens.accent);
  }, [ready, settings.theme]);

  // refresh "best" shown on the menu/HUD (reads localStorage — post-render only)
  useEffect(() => {
    if (phase === "menu" || phase === "gameover") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBest(loadLocalBest()[mode]);
    }
  }, [phase, mode]);

  // first-run tutorial
  const seenTutorial = settings.meta.seenTutorial;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && !seenTutorial) setShowTutorial(true);
  }, [ready, seenTutorial]);

  // ---------- game lifecycle ----------

  const handleGameOver = useCallback(
    (stats: FinalStats) => {
      keyboardRef.current?.setEnabled(false);
      loopRef.current?.setPaused(true);
      sfxRef.current?.play("gameOver");
      const modeId = engineRef.current?.mode.id ?? "marathon";
      const failedSprint = modeId === "sprint" && stats.reason !== "goalReached";
      const value = modeId === "sprint" ? stats.durationMs : stats.score;

      let isLocalBest = false;
      if (!failedSprint) {
        isLocalBest = recordLocalBest(modeId, value).isNewBest;
      }

      const token = tokenRef.current;
      if (failedSprint || !token) {
        setResult({
          stats,
          isLocalBest,
          submitState: { kind: "guest" },
        });
      } else {
        setResult({ stats, isLocalBest, submitState: { kind: "submitting" } });
        void submitScore({
          token,
          mode: modeId,
          score: stats.score,
          lines: stats.lines,
          level: stats.level,
          duration_ms: stats.durationMs,
          client_version: "1.0.0",
        }).then((res) => {
          setResult((current) =>
            current
              ? {
                  ...current,
                  submitState: res.ok
                    ? {
                        kind: "submitted",
                        rank: res.result.rank,
                        personalBest: res.result.personalBest,
                      }
                    : { kind: "failed" },
                }
              : current,
          );
        });
      }
      setPhase("gameover");
    },
    [],
  );
  const handleGameOverRef = useRef(handleGameOver);
  useEffect(() => {
    handleGameOverRef.current = handleGameOver;
  }, [handleGameOver]);

  const runCountdown = useCallback((onDone: () => void) => {
    setPhase("countdown");
    setCountdownValue(3);
    sfxRef.current?.play("countdownTick");
    after(700, () => {
      setCountdownValue(2);
      sfxRef.current?.play("countdownTick");
    });
    after(1400, () => {
      setCountdownValue(1);
      sfxRef.current?.play("countdownTick");
    });
    after(2100, () => {
      setCountdownValue(0);
      sfxRef.current?.play("countdownGo");
    });
    after(2500, onDone);
  }, []);

  const startGame = useCallback(
    (selectedMode: ModeId) => {
      clearTimers();
      const fx = fxRef.current;
      fx?.reset();
      setPopups([]);
      setResult(null);
      pendingDropRef.current = 0;

      const seedArray = new Uint32Array(4);
      crypto.getRandomValues(seedArray);
      const seed: Seed = [
        seedArray[0],
        seedArray[1],
        seedArray[2],
        seedArray[3],
      ];

      const engine = new Engine(MODES[selectedMode], seed, {
        startLevel,
        config: {
          dasTicks: msToTicks(settings.gameplay.das),
          arrTicks: msToTicks(settings.gameplay.arr),
          ghost: settings.gameplay.ghost,
        },
      });
      recorderRef.current = new ReplayRecorder(selectedMode, seed, startLevel);

      const sfx = sfxRef.current;
      const renderer = rendererRef.current;
      const ev = engine.events;
      ev.on("pieceMove", () => sfx?.play("move"));
      ev.on("pieceRotate", () => sfx?.play("rotate"));
      ev.on("softDropStep", () => sfx?.play("softDrop"));
      ev.on("hardDrop", (e) => {
        sfx?.play("hardDrop");
        pendingDropRef.current = e.distance;
      });
      ev.on("pieceLock", (e) => {
        sfx?.play("lock");
        const now = performance.now();
        fx?.onPieceLock(e.cells, now);
        const distance = pendingDropRef.current;
        pendingDropRef.current = 0;
        if (distance > 0 && fx && tokensRef.current) {
          const columns = [...new Set(e.cells.map((i) => i % 10))];
          const toRow = Math.min(...e.cells.map((i) => Math.floor(i / 10)));
          fx.onHardDrop(
            columns,
            Math.min(19, toRow + distance),
            toRow,
            pieceColor(tokensRef.current, e.piece),
            now,
          );
        }
      });
      ev.on("lineClear", (e) => {
        const now = performance.now();
        sfx?.play(`clear${e.lines}` as SfxName, e.combo);
        if (e.b2b) sfx?.play("b2b");
        if (e.combo > 0 && e.lines < 4) sfx?.playCombo(e.combo);
        if (fx && renderer && tokensRef.current) {
          const glow = tokensRef.current.glow;
          fx.onLineClear(
            e.rows,
            e.rows.map(() => Array(10).fill(glow) as string[]),
            e.lines === 4,
            now,
            renderer.cellSize,
            renderer.rowToY,
          );
          renderer.markBoardDirty();
        }
        if (e.tSpin !== "none") {
          const names = ["", "SINGLE", "DOUBLE", "TRIPLE"];
          pushPopup(
            e.tSpin === "mini"
              ? "T-SPIN MINI"
              : `T-SPIN ${names[e.lines] ?? ""}`.trim(),
          );
        } else if (e.lines === 4) pushPopup("CASCADE!");
        else if (e.lines === 3) pushPopup("TRIPLE!");
        else if (e.lines === 2) pushPopup("DOUBLE!");
        if (e.b2b) pushPopup("BACK-TO-BACK");
        if (e.combo >= 2) pushPopup(`COMBO ×${e.combo}`);
        if (e.perfectClear) pushPopup("PERFECT CLEAR!");
      });
      ev.on("levelUp", (e) => {
        sfx?.play("levelUp");
        fx?.onLevelUp(performance.now());
        pushPopup(`LEVEL ${e.level}`);
      });
      ev.on("hold", () => sfx?.play("hold"));
      ev.on("holdBlocked", () => sfx?.play("holdBlocked"));
      ev.on("gameOver", (e) => handleGameOverRef.current(e.stats));

      engineRef.current = engine;
      rendererRef.current?.markBoardDirty();

      // fetch a session token in parallel with the countdown (guests get null)
      tokenRef.current = null;
      void startGameSession(selectedMode).then((token) => {
        tokenRef.current = token;
      });

      const loop = loopRef.current;
      loop?.setPaused(true);
      loop?.start();
      runCountdown(() => {
        keyboardRef.current?.setEnabled(true);
        loopRef.current?.setPaused(false);
        setPhase("playing");
      });
    },
    [settings.gameplay, startLevel, pushPopup, runCountdown],
  );

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    sfxRef.current?.play("resume");
    runCountdown(() => {
      keyboardRef.current?.setEnabled(true);
      loopRef.current?.setPaused(false);
      setPhase("playing");
    });
  }, [runCountdown]);

  const quitToMenu = useCallback(() => {
    clearTimers();
    keyboardRef.current?.setEnabled(false);
    loopRef.current?.stop();
    engineRef.current = null;
    fxRef.current?.reset();
    setSnap(null);
    setResult(null);
    setPopups([]);
    setPhase("menu");
  }, []);

  // pause key routes here (works in playing AND paused for toggle)
  useEffect(() => {
    keyboardRef.current?.setPauseHandler(() => {
      if (phaseRef.current === "playing") pauseGame();
      else if (phaseRef.current === "paused") resumeGame();
    });
  }, [pauseGame, resumeGame]);

  const pushTouchAction = useCallback((action: InputAction) => {
    keyboardRef.current?.push(action);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    if (!settings.meta.seenTutorial) {
      update((s) => ({ ...s, meta: { ...s.meta, seenTutorial: true } }));
    }
  }, [settings.meta.seenTutorial, update]);

  const animatedPopups = settings.effects.intensity >= 25;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-3 py-4">
      <div className="flex w-full items-start justify-center gap-3">
        {/* left column */}
        <div className="hidden w-36 flex-col gap-3 md:flex">
          <HoldBox hold={snap?.hold ?? null} canHold={snap?.canHold ?? true} />
          <Hud snapshot={snap} mode={mode} best={best} />
        </div>

        {/* board */}
        <div className="flex w-full flex-col items-center md:w-auto">
          {/* mobile top strip */}
          <div className="mb-2 flex w-full items-center justify-between gap-2 md:hidden">
            <HoldBox hold={snap?.hold ?? null} canHold={snap?.canHold ?? true} />
            <Hud snapshot={snap} mode={mode} best={best} />
            <NextQueue queue={(snap?.queue ?? []).slice(0, 2)} />
          </div>

          <div
            ref={containerRef}
            className="relative"
            style={{ height: "min(68vh, 640px)", width: "min(88vw, 340px)" }}
          >
            <div
              ref={boardWrapRef}
              className="absolute left-1/2 top-0 -translate-x-1/2 rounded-md border border-border"
              style={{ width: boardSize.w, height: boardSize.h }}
            >
              <canvas
                ref={boardCanvasRef}
                className="absolute inset-0"
                aria-label="Cascade playfield"
                role="img"
              />
              <canvas ref={pieceCanvasRef} className="absolute inset-0" />
              <canvas ref={fxCanvasRef} className="absolute inset-0" />

              {/* popups */}
              <div className="pointer-events-none absolute inset-x-0 top-1/4 z-10 flex flex-col items-center gap-1">
                {popups.map((popup) => (
                  <span
                    key={popup.id}
                    className={`font-black tracking-widest text-transparent [-webkit-text-stroke:0] text-xl md:text-2xl ${
                      animatedPopups ? "animate-popup" : ""
                    }`}
                    style={{
                      color: "var(--st-glow)",
                      textShadow: "0 0 12px var(--st-glow)",
                    }}
                  >
                    {popup.text}
                  </span>
                ))}
              </div>

              {/* dim during overlays */}
              {(phase === "menu" ||
                phase === "paused" ||
                phase === "gameover") && (
                <div className="absolute inset-0 z-10 bg-black/40" />
              )}
            </div>

            {phase === "menu" && !showTutorial && (
              <StartOverlay
                mode={mode}
                startLevel={startLevel}
                best={best}
                onModeChange={setMode}
                onStartLevelChange={setStartLevel}
                onStart={() => startGame(mode)}
                onHowToPlay={() => setShowTutorial(true)}
              />
            )}
            {phase === "countdown" && (
              <CountdownOverlay value={countdownValue} />
            )}
            {phase === "paused" && (
              <PauseOverlay
                onResume={resumeGame}
                onRestart={() => startGame(mode)}
                onQuit={quitToMenu}
              />
            )}
            {phase === "gameover" && result && (
              <GameOverOverlay
                stats={result.stats}
                mode={mode}
                submitState={
                  userId && result.submitState.kind === "guest" &&
                  !(mode === "sprint" && result.stats.reason !== "goalReached")
                    ? { kind: "failed" }
                    : result.submitState
                }
                isLocalBest={result.isLocalBest}
                onRetry={() => startGame(mode)}
                onQuit={quitToMenu}
              />
            )}
            {showTutorial && <TutorialOverlay onClose={closeTutorial} />}
          </div>

          {/* touch pad */}
          {settings.accessibility.touchButtons &&
            (phase === "playing" || phase === "countdown") && (
              <TouchControls onAction={pushTouchAction} />
            )}
        </div>

        {/* right column */}
        <div className="hidden w-36 flex-col gap-3 md:flex">
          <NextQueue queue={snap?.queue ?? []} />
          <div className="flex justify-center gap-2 rounded-lg border border-border bg-surface p-2">
            <button
              aria-label={settings.audio.muted ? "Unmute" : "Mute"}
              className="rounded p-1.5 text-lg hover:bg-surface-2"
              onClick={() =>
                update((s) => ({
                  ...s,
                  audio: { ...s.audio, muted: !s.audio.muted },
                }))
              }
            >
              {settings.audio.muted ? "🔇" : "🔊"}
            </button>
            <button
              aria-label={
                settings.gameplay.ghost ? "Hide ghost piece" : "Show ghost piece"
              }
              className={`rounded p-1.5 text-lg hover:bg-surface-2 ${
                settings.gameplay.ghost ? "" : "opacity-40"
              }`}
              onClick={() =>
                update((s) => ({
                  ...s,
                  gameplay: { ...s.gameplay, ghost: !s.gameplay.ghost },
                }))
              }
            >
              👻
            </button>
          </div>
        </div>
      </div>
      <SrScore snapshot={phase === "playing" ? snap : null} />
    </div>
  );
}
