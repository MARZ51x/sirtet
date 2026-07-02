// Visual effects: particles, row flashes, lock flashes, hard-drop trails,
// screen shake, level-up pulse. Everything is gated by the 0–100 intensity
// slider at the EMIT site, so lower settings never even allocate:
//   0      nothing (rows vanish instantly; popups render static in the DOM)
//   1–24   row flash only
//   25–49  + particles at 35% density, lock flash, short trails — no shake
//   50–74  + full particles, quad specials, shake on quad clears only
//   75–100 + hard-drop shake, stronger quad shake + white flash, glow blend,
//            particle density scaling up to 150%

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;
}

interface RowFlash {
  row: number;
  until: number;
}

interface CellFlash {
  cells: number[]; // board indices
  until: number;
}

interface Trail {
  column: number;
  fromRow: number;
  toRow: number;
  color: string;
  start: number;
  duration: number;
}

interface Shake {
  amplitude: number;
  start: number;
  duration: number;
  vertical: boolean;
}

const POOL_SIZE = 512;
const GRAVITY = 480; // px/s^2

export class FxEngine {
  private intensity = 70;
  private shakeAllowed = true;
  private glowColor = "#22D3EE";
  private accentColor = "#22D3EE";

  private particles: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0,
    size: 0,
    color: "",
    active: false,
  }));
  private rowFlashes: RowFlash[] = [];
  private cellFlash: CellFlash | null = null;
  private trails: Trail[] = [];
  private shake: Shake | null = null;
  private boardFlashUntil = 0;
  private levelPulseStart = 0;
  private lastDraw = 0;

  configure(intensity: number, shakeAllowed: boolean): void {
    this.intensity = intensity;
    this.shakeAllowed = shakeAllowed;
  }

  setColors(glow: string, accent: string): void {
    this.glowColor = glow;
    this.accentColor = accent;
  }

  get hasWork(): boolean {
    return (
      this.rowFlashes.length > 0 ||
      this.trails.length > 0 ||
      this.cellFlash !== null ||
      this.shake !== null ||
      this.boardFlashUntil > 0 ||
      this.levelPulseStart > 0 ||
      this.particles.some((p) => p.active)
    );
  }

  reset(): void {
    for (const p of this.particles) p.active = false;
    this.rowFlashes = [];
    this.cellFlash = null;
    this.trails = [];
    this.shake = null;
    this.boardFlashUntil = 0;
    this.levelPulseStart = 0;
  }

  // ---------- emitters ----------

  onLineClear(
    rows: number[],
    cellColors: string[][], // per row: 10 colors of the cleared cells
    isQuad: boolean,
    now: number,
    cellPx: number,
    rowToY: (row: number) => number,
  ): void {
    const i = this.intensity;
    if (i === 0) return;

    for (const row of rows) {
      this.rowFlashes.push({ row, until: now + 100 });
    }

    if (i >= 25) {
      const perCell = i >= 75 ? 3 + (1.5 * (i - 75)) / 25 : i >= 50 ? 3 : 1;
      rows.forEach((row, rIdx) => {
        const yPx = rowToY(row) + cellPx / 2;
        for (let x = 0; x < 10; x++) {
          const color = cellColors[rIdx]?.[x] ?? this.glowColor;
          const n = Math.round(perCell);
          for (let k = 0; k < n; k++) {
            this.spawnParticle(x * cellPx + cellPx / 2, yPx, color, now);
          }
        }
      });
    }

    if (isQuad && i >= 50) {
      this.startShake(i >= 75 ? 6 : 4, i >= 75 ? 300 : 220, false, now);
      if (i >= 75) this.boardFlashUntil = now + 80;
    }
  }

  onHardDrop(
    columns: number[],
    fromRow: number,
    toRow: number,
    color: string,
    now: number,
  ): void {
    const i = this.intensity;
    if (i < 25) return;
    const duration = i >= 75 ? 150 : 80;
    for (const column of columns) {
      this.trails.push({ column, fromRow, toRow, color, start: now, duration });
    }
    if (i >= 75) this.startShake(2, 80, true, now);
  }

  onPieceLock(cells: number[], now: number): void {
    if (this.intensity < 25) return;
    this.cellFlash = { cells, until: now + 80 };
  }

  onLevelUp(now: number): void {
    if (this.intensity < 50) return;
    this.levelPulseStart = now;
  }

  /** current shake offset in px; apply as a CSS transform on the board container */
  shakeOffset(now: number): { x: number; y: number } {
    if (!this.shake || !this.shakeAllowed) return ZERO;
    const t = now - this.shake.start;
    if (t >= this.shake.duration) {
      this.shake = null;
      return ZERO;
    }
    const decay = 1 - t / this.shake.duration;
    const wave = Math.sin((t / 1000) * 30 * Math.PI * 2);
    const value = wave * this.shake.amplitude * decay;
    return this.shake.vertical ? { x: 0, y: value } : { x: value, y: 0 };
  }

  // ---------- drawing ----------

  draw(
    ctx: CanvasRenderingContext2D,
    cellPx: number,
    boardW: number,
    boardH: number,
    now: number,
    rowToY: (row: number) => number,
  ): void {
    const dt = this.lastDraw ? Math.min((now - this.lastDraw) / 1000, 0.05) : 0;
    this.lastDraw = now;
    ctx.clearRect(0, 0, boardW, boardH);
    if (this.intensity === 0) return;

    // row flashes
    this.rowFlashes = this.rowFlashes.filter((f) => f.until > now);
    for (const flash of this.rowFlashes) {
      ctx.globalAlpha = 0.8 * ((flash.until - now) / 100);
      ctx.fillStyle = this.glowColor;
      ctx.fillRect(0, rowToY(flash.row), boardW, cellPx);
    }
    ctx.globalAlpha = 1;

    // hard-drop trails
    this.trails = this.trails.filter((t) => now - t.start < t.duration);
    for (const trail of this.trails) {
      const progress = (now - trail.start) / trail.duration;
      const alpha = 0.35 * (1 - progress);
      const top = rowToY(trail.fromRow);
      const bottom = rowToY(trail.toRow);
      const gradient = ctx.createLinearGradient(0, top, 0, bottom);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(1, trail.color);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(trail.column * cellPx, top, cellPx, bottom - top + cellPx);
    }
    ctx.globalAlpha = 1;

    // lock flash
    if (this.cellFlash) {
      if (this.cellFlash.until <= now) {
        this.cellFlash = null;
      } else {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#ffffff";
        for (const idx of this.cellFlash.cells) {
          const x = idx % 10;
          const row = Math.floor(idx / 10);
          if (row < 20) {
            ctx.fillRect(x * cellPx, rowToY(row), cellPx, cellPx);
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    // particles
    const additive = this.intensity >= 75;
    if (additive) ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt * 1000;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const lifeFrac = p.life / p.maxLife;
      ctx.globalAlpha = lifeFrac < 0.4 ? lifeFrac / 0.4 : 1;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (additive) ctx.globalCompositeOperation = "source-over";

    // quad white flash
    if (this.boardFlashUntil > now) {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, boardW, boardH);
      ctx.globalAlpha = 1;
    } else {
      this.boardFlashUntil = 0;
    }

    // level-up pulse: accent overlay + expanding ring
    if (this.levelPulseStart > 0) {
      const t = now - this.levelPulseStart;
      if (t > 500) {
        this.levelPulseStart = 0;
      } else {
        if (t < 400) {
          ctx.globalAlpha = 0.12 * (1 - t / 400);
          ctx.fillStyle = this.accentColor;
          ctx.fillRect(0, 0, boardW, boardH);
        }
        const radius = (t / 500) * boardW;
        ctx.globalAlpha = 0.5 * (1 - t / 500);
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(boardW / 2, boardH / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---------- internals ----------

  private spawnParticle(
    x: number,
    y: number,
    color: string,
    now: number,
  ): void {
    const p = this.particles.find((q) => !q.active);
    if (!p) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 160;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 80; // upward bias
    p.maxLife = 400 + Math.random() * 300;
    p.life = p.maxLife;
    p.size = 2 + Math.random() * 2;
    p.color = color;
    p.active = true;
    void now;
  }

  private startShake(
    amplitude: number,
    duration: number,
    vertical: boolean,
    now: number,
  ): void {
    if (!this.shakeAllowed) return;
    this.shake = { amplitude, duration, vertical, start: now };
  }
}

const ZERO = { x: 0, y: 0 };
