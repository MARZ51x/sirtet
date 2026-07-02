"use client";

import { useSettings } from "@/lib/settings/SettingsProvider";
import { clientEnv } from "@/lib/env";

/**
 * Fixed full-viewport user background image behind all content, with
 * settings-driven dim + blur so the board always stays readable.
 * The `backgrounds` bucket is public — a stable CDN URL, no signing.
 */
export default function BackgroundLayer() {
  const { settings, ready } = useSettings();
  const { enabled, path } = settings.background;
  if (!ready || !enabled || !path) return null;

  const url = `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/backgrounds/${path}`;

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${JSON.stringify(url)})`,
          filter: "blur(var(--bg-blur))",
          transform: "scale(1.05)", // hides blur edge fringing
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "rgb(0 0 0 / var(--bg-dim))" }}
      />
    </div>
  );
}
