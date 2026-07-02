import Link from "next/link";
import { redirect } from "next/navigation";
import { MODE_LABELS } from "@/game/core/modes";
import type { ModeId } from "@/game/core/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccountForms } from "./AccountForms";

export const metadata = { title: "Profile" };

function formatMs(ms: number): string {
  const s = ms / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, created_at, username_changed_at")
    .eq("id", user.id)
    .single();

  const modes: ModeId[] = ["marathon", "sprint", "ultra"];
  const bests = await Promise.all(
    modes.map(async (mode) => {
      const { data } = await supabase.rpc("get_my_rank", { p_mode: mode });
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      return { mode, row };
    }),
  );

  const { data: recent } = await supabase
    .from("scores")
    .select("id, mode, score, lines, level, duration_ms, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-text">
        {profile?.username ?? "Player"}
      </h1>
      <p className="mb-6 text-sm text-text-muted">
        Member since{" "}
        {profile
          ? new Date(profile.created_at).toLocaleDateString()
          : "recently"}
      </p>

      <h2 className="mb-2 text-sm font-semibold tracking-widest text-text-muted">
        PERSONAL BESTS
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {bests.map(({ mode, row }) => (
          <div
            key={mode}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <p className="text-xs font-semibold tracking-widest text-text-muted">
              {MODE_LABELS[mode].toUpperCase()}
            </p>
            {row ? (
              <>
                <p className="font-mono text-xl font-bold text-text">
                  {mode === "sprint"
                    ? formatMs(row.duration_ms)
                    : row.score.toLocaleString()}
                </p>
                <p className="text-sm text-accent">
                  Rank #{row.rank} of {row.total_players}
                </p>
              </>
            ) : (
              <p className="text-sm text-text-muted">No runs yet</p>
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-sm font-semibold tracking-widest text-text-muted">
        RECENT GAMES
      </h2>
      {recent && recent.length > 0 ? (
        <div className="mb-8 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-text-muted">
              <tr>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Lines</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id} className="border-t border-border/50">
                  <td className="px-3 py-2 capitalize text-text">{row.mode}</td>
                  <td className="px-3 py-2 font-mono text-text">
                    {row.score.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-text-muted">{row.lines}</td>
                  <td className="px-3 py-2 font-mono text-text-muted">
                    {formatMs(row.duration_ms)}
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-8 text-sm text-text-muted">
          No games on the board yet —{" "}
          <Link href="/" className="text-accent underline underline-offset-4">
            play one
          </Link>
          .
        </p>
      )}

      <AccountForms
        username={profile?.username ?? ""}
        usernameChangedAt={profile?.username_changed_at ?? null}
      />
    </div>
  );
}
