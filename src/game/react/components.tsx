"use client";

import type { EngineSnapshot, PieceKind } from "@/game/core/types";
import { cellOffsets } from "@/game/core/pieces";
import type { InputAction, ModeId } from "@/game/core/types";
import { TICKS_PER_SECOND } from "@/game/core/types";

const PIECE_VAR: Record<PieceKind, string> = {
  I: "var(--st-piece-i)",
  O: "var(--st-piece-o)",
  T: "var(--st-piece-t)",
  S: "var(--st-piece-s)",
  Z: "var(--st-piece-z)",
  J: "var(--st-piece-j)",
  L: "var(--st-piece-l)",
};

export function formatTicksAsClock(ticks: number): string {
  const totalSeconds = ticks / TICKS_PER_SECOND;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((totalSeconds % 1) * 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(
    hundredths,
  ).padStart(2, "0")}`;
}

/** Tiny DOM rendering of a tetromino (rotation 0) for hold/next previews. */
export function MiniPiece({ kind }: { kind: PieceKind | null }) {
  if (!kind) {
    return <div className="h-8 w-16" aria-hidden />;
  }
  const offsets = cellOffsets(kind, 0);
  const minX = Math.min(...offsets.map(([x]) => x));
  const minY = Math.min(...offsets.map(([, y]) => y));
  const cells = offsets.map(([x, y]) => [x - minX, y - minY] as const);
  const width = Math.max(...cells.map(([x]) => x)) + 1;
  const height = Math.max(...cells.map(([, y]) => y)) + 1;
  return (
    <div
      className="relative"
      style={{ width: width * 14, height: height * 14 }}
      aria-label={`${kind} piece`}
      role="img"
    >
      {cells.map(([x, y], i) => (
        <span
          key={i}
          className="absolute rounded-[2px]"
          style={{
            left: x * 14,
            bottom: y * 14,
            width: 12,
            height: 12,
            background: PIECE_VAR[kind],
          }}
        />
      ))}
    </div>
  );
}

export function HoldBox({
  hold,
  canHold,
}: {
  hold: PieceKind | null;
  canHold: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="mb-2 text-xs font-semibold tracking-widest text-text-muted">
        HOLD
      </p>
      <div
        className={`flex h-10 items-center justify-center ${
          canHold ? "" : "opacity-40"
        }`}
      >
        <MiniPiece kind={hold} />
      </div>
    </div>
  );
}

export function NextQueue({ queue }: { queue: readonly PieceKind[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="mb-2 text-xs font-semibold tracking-widest text-text-muted">
        NEXT
      </p>
      <div className="flex flex-col items-center gap-3">
        {queue.map((kind, i) => (
          <div
            key={i}
            className={`flex h-8 items-center justify-center ${i === 0 ? "" : "opacity-70"}`}
          >
            <MiniPiece kind={kind} />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface HudStats {
  score: number;
  level: number;
  lines: number;
  best: number | null;
}

export function Hud({
  snapshot,
  mode,
  best,
}: {
  snapshot: EngineSnapshot | null;
  mode: ModeId;
  best: number | null;
}) {
  const score = snapshot?.score ?? 0;
  const level = snapshot?.level ?? 1;
  const lines = snapshot?.lines ?? 0;
  const ticks = snapshot?.ticks ?? 0;

  const rows: [string, string][] = [];
  if (mode === "sprint") {
    rows.push(["LINES LEFT", String(Math.max(0, 40 - lines))]);
    rows.push(["TIME", formatTicksAsClock(ticks)]);
    rows.push([
      "BEST",
      best !== null ? formatTicksAsClock((best / 1000) * TICKS_PER_SECOND) : "—",
    ]);
  } else if (mode === "ultra") {
    rows.push(["SCORE", score.toLocaleString()]);
    rows.push([
      "TIME LEFT",
      formatTicksAsClock(Math.max(0, 120 * TICKS_PER_SECOND - ticks)),
    ]);
    rows.push(["LINES", String(lines)]);
    rows.push(["BEST", best !== null ? best.toLocaleString() : "—"]);
  } else {
    rows.push(["SCORE", score.toLocaleString()]);
    rows.push(["LEVEL", String(level)]);
    rows.push(["LINES", String(lines)]);
    rows.push(["BEST", best !== null ? best.toLocaleString() : "—"]);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <p className="text-[10px] font-semibold tracking-widest text-text-muted">
            {label}
          </p>
          <p className="font-mono text-lg font-bold text-text tabular-nums">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Screen-reader mirror of the score, throttled by the parent. */
export function SrScore({ snapshot }: { snapshot: EngineSnapshot | null }) {
  if (!snapshot) return null;
  return (
    <p className="sr-only" aria-live="polite">
      Score {snapshot.score}, level {snapshot.level}, {snapshot.lines} lines
    </p>
  );
}

// ---------- touch controls (button pad) ----------

interface TouchControlsProps {
  onAction: (action: InputAction) => void;
  onHoldButton: () => void;
}

export function TouchControls({ onAction }: Omit<TouchControlsProps, "onHoldButton">) {
  const hold = (
    action: "moveLeft" | "moveRight" | "softDrop",
  ): React.DOMAttributes<HTMLButtonElement> => ({
    onPointerDown: (e) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      onAction({ action, edge: "press" });
    },
    onPointerUp: (e) => {
      e.preventDefault();
      onAction({ action, edge: "release" });
    },
    onPointerCancel: () => onAction({ action, edge: "release" }),
  });
  const tap = (
    action: "hardDrop" | "rotateCw" | "rotateCcw" | "hold",
  ): React.DOMAttributes<HTMLButtonElement> => ({
    onPointerDown: (e) => {
      e.preventDefault();
      onAction({ action });
    },
  });

  const cls =
    "flex h-12 min-w-12 items-center justify-center rounded-lg border border-border bg-surface-2/80 px-3 text-lg font-bold text-text active:bg-accent active:text-on-accent select-none touch-none";

  return (
    <div className="flex w-full items-center justify-between gap-2 pt-2 md:hidden">
      <div className="flex gap-2">
        <button aria-label="Move left" className={cls} {...hold("moveLeft")}>
          ◀
        </button>
        <button aria-label="Move right" className={cls} {...hold("moveRight")}>
          ▶
        </button>
      </div>
      <div className="flex gap-2">
        <button aria-label="Hold piece" className={cls} {...tap("hold")}>
          H
        </button>
        <button
          aria-label="Rotate counter-clockwise"
          className={cls}
          {...tap("rotateCcw")}
        >
          ↺
        </button>
        <button aria-label="Rotate clockwise" className={cls} {...tap("rotateCw")}>
          ↻
        </button>
      </div>
      <div className="flex gap-2">
        <button aria-label="Soft drop" className={cls} {...hold("softDrop")}>
          ▼
        </button>
        <button aria-label="Hard drop" className={cls} {...tap("hardDrop")}>
          ⤓
        </button>
      </div>
    </div>
  );
}
