import Link from "next/link";
import { MODE_IDS, MODE_LABELS } from "@/game/core/modes";
import type { ModeId } from "@/game/core/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Leaderboard" };
export const revalidate = 30;

const WINDOWS = [
  { id: "all", label: "All-time" },
  { id: "weekly", label: "This week" },
  { id: "daily", label: "Today" },
] as const;
type WindowId = (typeof WINDOWS)[number]["id"];

const PAGE_SIZE = 25;

function formatMs(ms: number): string {
  const s = ms / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; window?: string; page?: string }>;
}) {
  const params = await searchParams;
  const mode: ModeId = (MODE_IDS as string[]).includes(params.mode ?? "")
    ? (params.mode as ModeId)
    : "marathon";
  const window: WindowId = WINDOWS.some((w) => w.id === params.window)
    ? (params.window as WindowId)
    : "all";
  const page = Math.max(1, Math.min(40, Number(params.page) || 1));

  const supabase = await createSupabaseServerClient();

  const [{ data: rows, error }, { data: userData }] = await Promise.all([
    supabase.rpc("get_leaderboard", {
      p_mode: mode,
      p_window: window,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    }),
    supabase.auth.getUser(),
  ]);

  let myRank: { rank: number; value: string } | null = null;
  if (userData.user) {
    const { data: mine } = await supabase.rpc("get_my_rank", {
      p_mode: mode,
      p_window: window,
    });
    const row = Array.isArray(mine) && mine.length > 0 ? mine[0] : null;
    if (row) {
      myRank = {
        rank: Number(row.rank),
        value:
          mode === "sprint"
            ? formatMs(row.duration_ms)
            : row.score.toLocaleString(),
      };
    }
  }

  const tab = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold ${
      active
        ? "bg-accent text-on-accent"
        : "border border-border bg-surface text-text-muted hover:text-text"
    }`;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-text">Leaderboard</h1>

      <div className="mb-3 flex flex-wrap gap-2">
        {MODE_IDS.map((id) => (
          <Link
            key={id}
            href={`/leaderboard?mode=${id}&window=${window}`}
            className={tab(id === mode)}
          >
            {MODE_LABELS[id]}
          </Link>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {WINDOWS.map((w) => (
          <Link
            key={w.id}
            href={`/leaderboard?mode=${mode}&window=${w.id}`}
            className={tab(w.id === window)}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {myRank && (
        <p className="mb-3 rounded-lg border border-accent/50 bg-surface px-4 py-2 text-sm text-text">
          Your best: <span className="font-mono font-bold">{myRank.value}</span>{" "}
          — rank <span className="font-bold text-accent">#{myRank.rank}</span>
        </p>
      )}

      {error ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="mb-2 text-text">Couldn&apos;t load the leaderboard.</p>
          <Link
            href={`/leaderboard?mode=${mode}&window=${window}`}
            className="text-accent underline underline-offset-4"
          >
            Retry
          </Link>
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="mb-1 text-text">No scores yet — be the first.</p>
          <Link href="/" className="text-accent underline underline-offset-4">
            Play now
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-text-muted">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">
                  {mode === "sprint" ? "Time" : "Score"}
                </th>
                <th className="px-3 py-2">Lines</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.rank}-${row.user_id}`}
                  className="border-t border-border/50"
                >
                  <td className="px-3 py-2 font-mono text-text-muted">
                    {row.rank}
                  </td>
                  <td className="px-3 py-2 font-semibold text-text">
                    {row.username}
                  </td>
                  <td className="px-3 py-2 font-mono text-text">
                    {mode === "sprint"
                      ? formatMs(row.duration_ms)
                      : row.score.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-text-muted">{row.lines}</td>
                  <td className="px-3 py-2 text-text-muted">{row.level}</td>
                  <td className="px-3 py-2 text-text-muted">
                    {new Date(row.achieved_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex justify-between text-sm">
        {page > 1 ? (
          <Link
            href={`/leaderboard?mode=${mode}&window=${window}&page=${page - 1}`}
            className="text-accent hover:underline"
          >
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {rows && rows.length === PAGE_SIZE && (
          <Link
            href={`/leaderboard?mode=${mode}&window=${window}&page=${page + 1}`}
            className="text-accent hover:underline"
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
