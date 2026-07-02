import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    username = profile?.username ?? null;
  }

  return (
    <header className="z-30 flex h-14 items-center justify-between border-b border-border/60 bg-surface/70 px-4 backdrop-blur">
      <Link
        href="/"
        className="text-lg font-black tracking-[0.25em] text-accent"
      >
        SIRTET
      </Link>
      <nav className="flex items-center gap-4 text-sm font-medium">
        <Link href="/" className="text-text-muted hover:text-text">
          Play
        </Link>
        <Link href="/leaderboard" className="text-text-muted hover:text-text">
          Leaderboard
        </Link>
        <Link href="/settings" className="text-text-muted hover:text-text">
          Settings
        </Link>
        {user ? (
          <Link
            href="/profile"
            className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-text hover:border-accent"
          >
            {username ?? "Profile"}
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-on-accent hover:opacity-90"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
