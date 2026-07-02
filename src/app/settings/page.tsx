"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SfxPlayer } from "@/game/audio/sfx";
import {
  ACTION_LABELS,
  BINDABLE_ACTIONS,
  DEFAULT_KEY_BINDINGS,
  type BindableAction,
} from "@/lib/settings/schema";
import { useSettings } from "@/lib/settings/SettingsProvider";
import { prefersReducedMotion } from "@/lib/settings/store";
import {
  processAndUploadBackground,
  removeBackground,
} from "@/lib/backgrounds/upload";
import { ThemeSection } from "./ThemeSection";

const sectionTitle =
  "mb-3 text-sm font-semibold tracking-widest text-text-muted";
const card = "rounded-lg border border-border bg-surface p-4";
const sliderCls = "mt-1 w-full accent-(--st-accent)";

function Slider({
  label,
  value,
  min,
  max,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-widest text-text-muted">
        {label} — {value}
        {suffix}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={sliderCls}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-text">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-(--st-accent)"
      />
    </label>
  );
}

export default function SettingsPage() {
  const { settings, update, userId, ready } = useSettings();
  const sfxRef = useRef<SfxPlayer | null>(null);
  const [uploadState, setUploadState] = useState<string | null>(null);
  const [rebinding, setRebinding] = useState<BindableAction | null>(null);
  const [bindError, setBindError] = useState<string | null>(null);
  const reducedMotion = ready && prefersReducedMotion();

  // test-sound player
  useEffect(() => {
    const sfx = new SfxPlayer();
    sfx.installUnlockListeners();
    sfxRef.current = sfx;
    return () => sfx.dispose();
  }, []);
  useEffect(() => {
    sfxRef.current?.setVolume(settings.audio.master, settings.audio.muted);
  }, [settings.audio]);

  // key-rebinding capture
  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === "Escape") {
        setRebinding(null);
        return;
      }
      const conflict = BINDABLE_ACTIONS.find(
        (action) =>
          action !== rebinding &&
          settings.keyBindings[action]?.includes(e.code),
      );
      if (conflict) {
        setBindError(
          `${e.code} is already bound to "${ACTION_LABELS[conflict]}".`,
        );
        setRebinding(null);
        return;
      }
      update((s) => ({
        ...s,
        keyBindings: { ...s.keyBindings, [rebinding]: [e.code] },
      }));
      setBindError(null);
      setRebinding(null);
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [rebinding, settings.keyBindings, update]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setUploadState("Uploading…");
    const result = await processAndUploadBackground(file, userId);
    if (result.ok) {
      update((s) => ({
        ...s,
        background: { ...s.background, enabled: true, path: result.path },
      }));
      setUploadState("Background updated ✓");
    } else {
      setUploadState(
        result.error === "size"
          ? "Image is over 5 MB."
          : result.error === "type"
            ? "Use a JPEG, PNG, or WebP image."
            : "Upload failed — try again.",
      );
    }
  }

  async function onRemoveBackground() {
    if (!userId) return;
    await removeBackground(userId);
    update((s) => ({
      ...s,
      background: { ...s.background, enabled: false, path: null },
    }));
    setUploadState("Background removed.");
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-text">Settings</h1>

      <ThemeSection />

      <section id="background" className="mb-8">
        <h2 className={sectionTitle}>BACKGROUND IMAGE</h2>
        <div className={card}>
          {userId ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text hover:border-accent">
                  Upload image…
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={onUpload}
                  />
                </label>
                {settings.background.path && (
                  <button
                    onClick={onRemoveBackground}
                    className="text-sm text-danger hover:underline"
                  >
                    Remove image
                  </button>
                )}
                {uploadState && (
                  <span className="text-sm text-text-muted">{uploadState}</span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <Slider
                  label="DIM"
                  value={settings.background.dim}
                  min={0}
                  max={90}
                  suffix="%"
                  onChange={(dim) =>
                    update((s) => ({
                      ...s,
                      background: { ...s.background, dim },
                    }))
                  }
                />
                <Slider
                  label="BLUR"
                  value={settings.background.blur}
                  min={0}
                  max={20}
                  suffix="px"
                  onChange={(blur) =>
                    update((s) => ({
                      ...s,
                      background: { ...s.background, blur },
                    }))
                  }
                />
              </div>
              <p className="mt-2 text-xs text-text-muted">
                JPEG/PNG/WebP up to 5 MB. Dim and blur keep the board readable.
              </p>
            </>
          ) : (
            <p className="text-sm text-text-muted">
              <Link
                href="/login?next=/settings"
                className="text-accent underline underline-offset-4"
              >
                Sign in
              </Link>{" "}
              to upload a custom background image. Guests can still use every
              theme and custom colors.
            </p>
          )}
        </div>
      </section>

      <section id="audio" className="mb-8">
        <h2 className={sectionTitle}>AUDIO</h2>
        <div className={`${card} flex flex-col gap-3`}>
          <Slider
            label="MASTER VOLUME"
            value={settings.audio.master}
            min={0}
            max={100}
            onChange={(master) =>
              update((s) => ({ ...s, audio: { ...s.audio, master } }))
            }
          />
          <Toggle
            label="Mute all sounds"
            checked={settings.audio.muted}
            onChange={(muted) =>
              update((s) => ({ ...s, audio: { ...s.audio, muted } }))
            }
          />
          <button
            onClick={() => sfxRef.current?.play("clear4")}
            className="self-start rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text hover:border-accent"
          >
            ♪ Test sound
          </button>
        </div>
      </section>

      <section id="effects" className="mb-8">
        <h2 className={sectionTitle}>VISUAL EFFECTS</h2>
        <div className={`${card} flex flex-col gap-3`}>
          <Slider
            label="INTENSITY"
            value={settings.effects.intensity}
            min={0}
            max={100}
            onChange={(intensity) =>
              update((s) => ({ ...s, effects: { ...s.effects, intensity } }))
            }
          />
          <p className="text-xs text-text-muted">
            0 = pure minimal (best performance) · 1–24 flashes only · 25–49
            adds particles · 50–74 full particles + shake on big clears ·
            75–100 everything with glow.
          </p>
          {reducedMotion && (
            <Toggle
              label="Allow motion effects (your system prefers reduced motion)"
              checked={settings.effects.allowMotionOverride}
              onChange={(allowMotionOverride) =>
                update((s) => ({
                  ...s,
                  effects: { ...s.effects, allowMotionOverride },
                }))
              }
            />
          )}
        </div>
      </section>

      <section id="controls" className="mb-8">
        <h2 className={sectionTitle}>CONTROLS</h2>
        <div className={`${card} flex flex-col gap-3`}>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {BINDABLE_ACTIONS.map((action) => (
              <div
                key={action}
                className="flex items-center justify-between gap-2 rounded border border-border/60 bg-surface-2 px-2 py-1.5"
              >
                <span className="text-sm text-text">
                  {ACTION_LABELS[action]}
                </span>
                <button
                  onClick={() => {
                    setBindError(null);
                    setRebinding(action);
                  }}
                  className={`rounded border px-2 py-0.5 font-mono text-xs ${
                    rebinding === action
                      ? "border-accent text-accent"
                      : "border-border text-text-muted hover:border-accent"
                  }`}
                >
                  {rebinding === action
                    ? "Press a key…"
                    : (settings.keyBindings[action] ?? []).join(" / ") ||
                      "unbound"}
                </button>
              </div>
            ))}
          </div>
          {bindError && (
            <p className="text-sm text-danger" role="alert">
              {bindError}
            </p>
          )}
          <button
            onClick={() =>
              update((s) => ({ ...s, keyBindings: { ...DEFAULT_KEY_BINDINGS } }))
            }
            className="self-start text-sm text-text-muted hover:text-accent"
          >
            Restore default keys
          </button>

          <hr className="border-border/60" />

          <Slider
            label="DAS (auto-shift delay)"
            value={settings.gameplay.das}
            min={67}
            max={333}
            suffix="ms"
            onChange={(das) =>
              update((s) => ({ ...s, gameplay: { ...s.gameplay, das } }))
            }
          />
          <Slider
            label="ARR (auto-repeat rate)"
            value={settings.gameplay.arr}
            min={0}
            max={83}
            suffix="ms"
            onChange={(arr) =>
              update((s) => ({ ...s, gameplay: { ...s.gameplay, arr } }))
            }
          />
          <Toggle
            label="Show ghost piece"
            checked={settings.gameplay.ghost}
            onChange={(ghost) =>
              update((s) => ({ ...s, gameplay: { ...s.gameplay, ghost } }))
            }
          />
          <Toggle
            label="On-screen touch buttons (phones)"
            checked={settings.accessibility.touchButtons}
            onChange={(touchButtons) =>
              update((s) => ({
                ...s,
                accessibility: { ...s.accessibility, touchButtons },
              }))
            }
          />
        </div>
      </section>

      <section id="account" className="mb-8">
        <h2 className={sectionTitle}>ACCOUNT</h2>
        <div className={card}>
          {userId ? (
            <p className="text-sm text-text-muted">
              Manage your username, password, and account on your{" "}
              <Link
                href="/profile"
                className="text-accent underline underline-offset-4"
              >
                profile page
              </Link>
              .
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              <Link
                href="/signup"
                className="text-accent underline underline-offset-4"
              >
                Create an account
              </Link>{" "}
              to post scores and sync these settings across devices.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
