"use client";

import { useSettings } from "@/lib/settings/SettingsProvider";
import type { ThemeTokens } from "@/lib/theme/themes";
import {
  contrastRatio,
  PRESET_IDS,
  PRESET_LABELS,
  PRESETS,
  type PresetId,
  type ThemeTokenKey,
} from "@/lib/theme/themes";

const GROUPS: { title: string; keys: ThemeTokenKey[] }[] = [
  {
    title: "Interface",
    keys: [
      "bg",
      "surface",
      "surface2",
      "border",
      "text",
      "textMuted",
      "accent",
      "onAccent",
      "danger",
    ],
  },
  { title: "Board", keys: ["boardBg", "boardGrid", "ghost"] },
  {
    title: "Pieces",
    keys: ["pieceI", "pieceO", "pieceT", "pieceS", "pieceZ", "pieceJ", "pieceL"],
  },
  { title: "Effects", keys: ["glow"] },
];

const TOKEN_LABELS: Record<ThemeTokenKey, string> = {
  bg: "Page background",
  surface: "Cards",
  surface2: "Raised panels",
  border: "Borders",
  text: "Text",
  textMuted: "Muted text",
  accent: "Accent",
  onAccent: "Text on accent",
  danger: "Danger",
  boardBg: "Board background",
  boardGrid: "Grid lines",
  pieceI: "I piece",
  pieceO: "O piece",
  pieceT: "T piece",
  pieceS: "S piece",
  pieceZ: "Z piece",
  pieceJ: "J piece",
  pieceL: "L piece",
  ghost: "Ghost piece",
  glow: "Effects glow",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ThemeSection() {
  const { settings, update } = useSettings();
  const { mode, presetId, customTokens } = settings.theme;

  const applyPreset = (id: PresetId) =>
    update((s) => ({
      ...s,
      theme: { ...s.theme, mode: "preset", presetId: id },
    }));

  const startCustomizing = () =>
    update((s) => ({
      ...s,
      theme: {
        ...s.theme,
        mode: "custom",
        customTokens: { ...(s.theme.customTokens ?? PRESETS[s.theme.presetId]) },
      },
    }));

  const setToken = (key: ThemeTokenKey, value: string) =>
    update((s) => ({
      ...s,
      theme: {
        ...s.theme,
        customTokens: s.theme.customTokens
          ? { ...s.theme.customTokens, [key]: value }
          : s.theme.customTokens,
      },
    }));

  const tokens: ThemeTokens = customTokens ?? PRESETS[presetId];

  return (
    <section id="appearance" className="mb-8">
      <h2 className="mb-3 text-sm font-semibold tracking-widest text-text-muted">
        THEME
      </h2>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PRESET_IDS.map((id) => {
          const p = PRESETS[id];
          const active = mode === "preset" && presetId === id;
          return (
            <button
              key={id}
              onClick={() => applyPreset(id)}
              aria-pressed={active}
              className={`rounded-lg border p-3 text-left ${
                active
                  ? "border-accent ring-1 ring-accent"
                  : "border-border hover:border-accent/50"
              }`}
              style={{ background: p.surface }}
            >
              <div className="mb-2 flex h-4 overflow-hidden rounded">
                {[p.bg, p.accent, p.pieceI, p.pieceT, p.pieceS].map(
                  (color, i) => (
                    <span key={i} className="flex-1" style={{ background: color }} />
                  ),
                )}
              </div>
              <span className="text-xs font-semibold" style={{ color: p.text }}>
                {PRESET_LABELS[id]}
              </span>
            </button>
          );
        })}
      </div>

      {mode === "preset" ? (
        <button
          onClick={startCustomizing}
          className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text hover:border-accent"
        >
          Customize colors…
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-text">Custom theme</h3>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() =>
                  update((s) => ({
                    ...s,
                    theme: {
                      ...s.theme,
                      customTokens: { ...PRESETS[s.theme.presetId] },
                    },
                  }))
                }
                className="text-text-muted hover:text-accent"
              >
                Reset to {PRESET_LABELS[presetId]}
              </button>
              <span className="text-border">·</span>
              <button
                onClick={() =>
                  update((s) => ({
                    ...s,
                    theme: { ...s.theme, mode: "preset" },
                  }))
                }
                className="text-text-muted hover:text-accent"
              >
                Back to presets
              </button>
            </div>
          </div>

          {GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="mb-2 text-xs font-semibold tracking-widest text-text-muted">
                {group.title.toUpperCase()}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.keys.map((key) => {
                  const value = tokens[key];
                  const isHex = HEX.test(value);
                  const lowContrast =
                    (key === "text" || key === "textMuted") &&
                    isHex &&
                    ((contrastRatio(value, tokens.bg) ?? 21) < 4.5 ||
                      (contrastRatio(value, tokens.surface) ?? 21) < 4.5);
                  return (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-2 rounded border border-border/60 bg-surface-2 px-2 py-1.5"
                    >
                      <span className="text-sm text-text">
                        {TOKEN_LABELS[key]}
                        {lowContrast && (
                          <span
                            className="ml-1 text-danger"
                            title="Contrast below WCAG AA (4.5:1) against the background"
                          >
                            ⚠
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setToken(key, e.target.value)}
                          className="w-24 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-text"
                          aria-label={`${TOKEN_LABELS[key]} value`}
                        />
                        {isHex && (
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => setToken(key, e.target.value)}
                            className="h-7 w-8 cursor-pointer rounded border border-border bg-transparent"
                            aria-label={`${TOKEN_LABELS[key]} color picker`}
                          />
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-text-muted">
            Changes apply live — the whole app is your preview. Ghost accepts
            rgba() for transparency.
          </p>
        </div>
      )}
    </section>
  );
}
