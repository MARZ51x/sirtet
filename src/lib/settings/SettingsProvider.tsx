"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { applyTheme, resolveTheme } from "@/lib/theme/themes";
import { defaultSettings, parseSettings, type Settings } from "./schema";
import { loadLocalSettings, saveLocalSettings, touch } from "./store";

// Settings live in localStorage for everyone and mirror to Supabase
// user_settings.data when signed in. Merge rule on login: newest-wins
// whole-object via meta.updatedAt — except the server's `background`
// sub-object survives when a guest-local object wins (guests can't have
// uploaded a background, so a guest win must not clobber it).

interface SettingsContextValue {
  settings: Settings;
  /** false until localStorage has been read (SSR renders defaults) */
  ready: boolean;
  userId: string | null;
  update: (updater: (current: Settings) => Settings) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const SYNC_DEBOUNCE_MS = 800;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => defaultSettings());
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabaseRef = useRef<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  const userIdRef = useRef(userId);

  useEffect(() => {
    settingsRef.current = settings;
    userIdRef.current = userId;
  }, [settings, userId]);

  // load local settings once on mount (sync-from-localStorage is the point;
  // SSR renders defaults, so this must happen post-hydration)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadLocalSettings());
    setReady(true);
  }, []);

  // apply theme whenever it changes
  useEffect(() => {
    if (!ready) return;
    applyTheme(
      resolveTheme(
        settings.theme.mode,
        settings.theme.presetId,
        settings.theme.customTokens,
      ),
    );
  }, [ready, settings.theme]);

  // background dim/blur CSS variables
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.style.setProperty("--bg-dim", String(settings.background.dim / 100));
    root.style.setProperty("--bg-blur", `${settings.background.blur}px`);
  }, [ready, settings.background.dim, settings.background.blur]);

  const scheduleRemoteSync = useCallback(() => {
    if (!userIdRef.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      const supabase = supabaseRef.current;
      const uid = userIdRef.current;
      if (!supabase || !uid) return;
      try {
        await supabase
          .from("user_settings")
          .upsert({ user_id: uid, data: settingsRef.current });
      } catch {
        // offline — localStorage still has the truth; next edit retries
      }
    }, SYNC_DEBOUNCE_MS);
  }, []);

  // auth-aware sync: merge on sign-in, listen for auth changes
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabaseRef.current = supabase;

    async function mergeForUser(uid: string) {
      const { data: row } = await supabase
        .from("user_settings")
        .select("data, updated_at")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;

      const local = settingsRef.current;
      if (!row || !row.data || typeof row.data !== "object") {
        // no server copy yet — push local
        await supabase
          .from("user_settings")
          .upsert({ user_id: uid, data: local });
        return;
      }
      const server = parseSettings(row.data);
      const serverStamp = Date.parse(server.meta.updatedAt) || 0;
      const localStamp = Date.parse(local.meta.updatedAt) || 0;

      if (serverStamp >= localStamp) {
        setSettings(server);
        saveLocalSettings(server);
      } else {
        // local wins, but never clobber the server's background (guest-local
        // objects always carry background.enabled = false)
        const merged: Settings = { ...local, background: server.background };
        setSettings(merged);
        saveLocalSettings(merged);
        await supabase
          .from("user_settings")
          .upsert({ user_id: uid, data: merged });
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) void mergeForUser(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (event === "SIGNED_IN" && uid) void mergeForUser(uid);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [ready]);

  const update = useCallback(
    (updater: (current: Settings) => Settings) => {
      setSettings((current) => {
        const next = touch(updater(current));
        saveLocalSettings(next);
        return next;
      });
      scheduleRemoteSync();
    },
    [scheduleRemoteSync],
  );

  return (
    <SettingsContext.Provider value={{ settings, ready, userId, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
