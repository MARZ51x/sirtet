"use client";

import Link from "next/link";
import type { FinalStats, ModeId } from "@/game/core/types";
import { MODE_IDS, MODE_LABELS } from "@/game/core/modes";
import { PRESET_IDS, PRESET_LABELS } from "@/lib/theme/themes";
import { useSettings } from "@/lib/settings/SettingsProvider";
import { formatTicksAsClock } from "./components";

function OverlayShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

const btn =
  "w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-on-accent hover:opacity-90 focus-visible:outline-2";
const btnGhost =
  "w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 font-semibold text-text hover:border-accent";

// ---------- start ----------

export function StartOverlay({
  mode,
  startLevel,
  best,
  onModeChange,
  onStartLevelChange,
  onStart,
  onHowToPlay,
}: {
  mode: ModeId;
  startLevel: number;
  best: number | null;
  onModeChange: (mode: ModeId) => void;
  onStartLevelChange: (level: number) => void;
  onStart: () => void;
  onHowToPlay: () => void;
}) {
  return (
    <OverlayShell>
      <h1 className="mb-1 text-center text-3xl font-black tracking-[0.3em] text-accent">
        SIRTET
      </h1>
      <p className="mb-5 text-center text-sm text-text-muted">
        Stack. Clear. Climb the board.
      </p>

      <p className="mb-2 text-xs font-semibold tracking-widest text-text-muted">
        MODE
      </p>
      <div className="mb-4 flex flex-col gap-2">
        {MODE_IDS.map((id) => (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            className={`rounded-lg border px-4 py-2 text-left font-semibold ${
              mode === id
                ? "border-accent bg-surface-2 text-text"
                : "border-border bg-surface-2/50 text-text-muted hover:border-accent/50"
            }`}
            aria-pressed={mode === id}
          >
            {MODE_LABELS[id]}
          </button>
        ))}
      </div>

      {mode === "marathon" && (
        <label className="mb-4 block">
          <span className="text-xs font-semibold tracking-widest text-text-muted">
            START LEVEL — {startLevel}
          </span>
          <input
            type="range"
            min={1}
            max={15}
            value={startLevel}
            onChange={(e) => onStartLevelChange(Number(e.target.value))}
            className="mt-1 w-full accent-(--st-accent)"
          />
        </label>
      )}

      {best !== null && (
        <p className="mb-4 text-center text-sm text-text-muted">
          Your best:{" "}
          <span className="font-mono font-bold text-text">
            {mode === "sprint"
              ? `${(best / 1000).toFixed(2)}s`
              : best.toLocaleString()}
          </span>
        </p>
      )}

      <button className={btn} onClick={onStart} autoFocus>
        Start (Enter)
      </button>
      <button
        className="mt-3 w-full text-center text-sm text-text-muted underline-offset-4 hover:text-accent hover:underline"
        onClick={onHowToPlay}
      >
        How to play
      </button>
    </OverlayShell>
  );
}

// ---------- countdown ----------

export function CountdownOverlay({ value }: { value: number }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
      <span
        key={value}
        className="text-7xl font-black text-accent drop-shadow-[0_0_24px_var(--st-glow)]"
      >
        {value > 0 ? value : "GO!"}
      </span>
    </div>
  );
}

// ---------- pause ----------

export function PauseOverlay({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  const { settings, update } = useSettings();
  return (
    <OverlayShell>
      <h2 className="mb-4 text-center text-xl font-bold text-text">Paused</h2>
      <div className="mb-4 flex flex-col gap-3">
        <label className="block">
          <span className="text-xs font-semibold tracking-widest text-text-muted">
            VOLUME — {settings.audio.master}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.audio.master}
            onChange={(e) =>
              update((s) => ({
                ...s,
                audio: { ...s.audio, master: Number(e.target.value) },
              }))
            }
            className="mt-1 w-full accent-(--st-accent)"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold tracking-widest text-text-muted">
            VISUAL EFFECTS — {settings.effects.intensity}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.effects.intensity}
            onChange={(e) =>
              update((s) => ({
                ...s,
                effects: { ...s.effects, intensity: Number(e.target.value) },
              }))
            }
            className="mt-1 w-full accent-(--st-accent)"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold tracking-widest text-text-muted">
            THEME
          </span>
          <select
            value={
              settings.theme.mode === "custom" ? "custom" : settings.theme.presetId
            }
            onChange={(e) => {
              const value = e.target.value;
              update((s) => ({
                ...s,
                theme:
                  value === "custom"
                    ? { ...s.theme, mode: "custom" }
                    : {
                        ...s.theme,
                        mode: "preset",
                        presetId: value as (typeof PRESET_IDS)[number],
                      },
              }));
            }}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-text"
          >
            {PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {PRESET_LABELS[id]}
              </option>
            ))}
            {settings.theme.customTokens && (
              <option value="custom">Custom</option>
            )}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <button className={btn} onClick={onResume} autoFocus>
          Resume (Esc)
        </button>
        <button className={btnGhost} onClick={onRestart}>
          Restart
        </button>
        <button className={btnGhost} onClick={onQuit}>
          Quit to menu
        </button>
      </div>
    </OverlayShell>
  );
}

// ---------- game over ----------

export type SubmitState =
  | { kind: "guest" }
  | { kind: "submitting" }
  | { kind: "submitted"; rank: number | null; personalBest: boolean }
  | { kind: "failed" };

export function GameOverOverlay({
  stats,
  mode,
  submitState,
  isLocalBest,
  onRetry,
  onQuit,
}: {
  stats: FinalStats;
  mode: ModeId;
  submitState: SubmitState;
  isLocalBest: boolean;
  onRetry: () => void;
  onQuit: () => void;
}) {
  const headline =
    mode === "sprint" && stats.reason === "goalReached"
      ? formatTicksAsClock(stats.ticks)
      : stats.score.toLocaleString();
  const failedRun = mode === "sprint" && stats.reason !== "goalReached";

  return (
    <OverlayShell>
      <h2 className="mb-1 text-center text-xl font-bold text-text">
        {stats.reason === "goalReached"
          ? "Finish!"
          : stats.reason === "timeUp"
            ? "Time's up!"
            : "Game over"}
      </h2>
      <p className="mb-4 text-center font-mono text-4xl font-black text-accent tabular-nums">
        {headline}
      </p>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Lines", String(stats.lines)],
          ["Level", String(stats.level)],
          ["Time", formatTicksAsClock(stats.ticks)],
          ["Pieces", String(stats.piecesPlaced)],
          ["PPS", stats.pps.toFixed(2)],
          ["Sirtets", String(stats.quads)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface-2 p-2">
            <p className="text-[10px] font-semibold tracking-widest text-text-muted">
              {label.toUpperCase()}
            </p>
            <p className="font-mono font-bold text-text">{value}</p>
          </div>
        ))}
      </div>

      {isLocalBest && !failedRun && (
        <p className="mb-2 text-center text-sm font-semibold text-accent">
          ★ New personal best!
        </p>
      )}

      <div className="mb-4 min-h-6 text-center text-sm">
        {failedRun ? (
          <span className="text-text-muted">
            Clear all 40 lines to post a Sprint time.
          </span>
        ) : submitState.kind === "guest" ? (
          <span className="text-text-muted">
            <Link
              href="/signup"
              className="text-accent underline underline-offset-4"
            >
              Create an account
            </Link>{" "}
            to post this score to the leaderboard.
          </span>
        ) : submitState.kind === "submitting" ? (
          <span className="text-text-muted">Submitting score…</span>
        ) : submitState.kind === "submitted" ? (
          <span className="text-text">
            {submitState.rank !== null ? (
              <>
                Leaderboard rank{" "}
                <span className="font-bold text-accent">
                  #{submitState.rank}
                </span>{" "}
                (all-time)
              </>
            ) : (
              "Score submitted!"
            )}
          </span>
        ) : (
          <span className="text-danger">
            Couldn&apos;t submit the score — check your connection.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button className={btn} onClick={onRetry} autoFocus>
          Play again (Enter)
        </button>
        <Link href="/leaderboard" className={`${btnGhost} text-center`}>
          Leaderboard
        </Link>
        <button className={btnGhost} onClick={onQuit}>
          Menu
        </button>
      </div>
    </OverlayShell>
  );
}

// ---------- tutorial ----------

export function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["← →", "Move"],
    ["↓", "Soft drop"],
    ["Space", "Hard drop"],
    ["↑ / X", "Rotate clockwise"],
    ["Z / Ctrl", "Rotate counter-clockwise"],
    ["C / Shift", "Hold piece"],
    ["Esc / P", "Pause"],
  ];
  return (
    <OverlayShell>
      <h2 className="mb-3 text-center text-xl font-bold text-text">
        How to play
      </h2>
      <p className="mb-3 text-sm text-text-muted">
        Stack falling pieces and fill complete rows to clear them. Clear four
        rows at once for a <span className="font-bold text-accent">SIRTET</span>.
        Back-to-back difficult clears and combos score extra. The game ends
        when the stack reaches the top.
      </p>
      <table className="mb-4 w-full text-sm">
        <tbody>
          {rows.map(([keys, label]) => (
            <tr key={keys} className="border-b border-border/50 last:border-0">
              <td className="py-1.5 font-mono font-semibold text-accent">
                {keys}
              </td>
              <td className="py-1.5 text-text">{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mb-4 text-xs text-text-muted">
        On phones, use the on-screen buttons under the board. Rebind keys in
        Settings → Controls.
      </p>
      <button className={btn} onClick={onClose} autoFocus>
        Got it
      </button>
    </OverlayShell>
  );
}
