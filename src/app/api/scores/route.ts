import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluatePlausibility, SCORE_HARD_CAPS } from "@/lib/anti-cheat";
import { verifyGameToken } from "@/lib/game-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TOKEN_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MIN = 5;
const RATE_LIMIT_MAX = 10;

const ScoreSubmission = z.object({
  token: z.string().max(512),
  mode: z.enum(["marathon", "sprint", "ultra"]),
  score: z.number().int().min(0).max(SCORE_HARD_CAPS.score),
  lines: z.number().int().min(0).max(SCORE_HARD_CAPS.lines),
  level: z.number().int().min(1).max(SCORE_HARD_CAPS.level),
  duration_ms: z.number().int().min(0).max(SCORE_HARD_CAPS.durationMs),
  client_version: z.string().max(20).optional(),
});

/**
 * The ONLY write path for scores (the table has no INSERT policy).
 * auth -> Zod -> token checks -> plausibility -> rate limit -> admin insert.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = ScoreSubmission.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const body = parsed.data;

  // --- token checks (hard) ---
  const token = verifyGameToken(body.token);
  const age = token ? Date.now() - token.iat : 0;
  if (
    !token ||
    token.uid !== user.id ||
    token.mode !== body.mode ||
    age < 0 ||
    age > TOKEN_MAX_AGE_MS
  ) {
    return NextResponse.json({ error: "invalid_session" }, { status: 422 });
  }

  // --- plausibility ---
  const verdict = evaluatePlausibility(
    {
      mode: body.mode,
      score: body.score,
      lines: body.lines,
      level: body.level,
      durationMs: body.duration_ms,
    },
    age,
  );
  if (verdict.hardFail) {
    console.warn("score rejected:", verdict.hardFail, {
      uid: user.id,
      ...body,
      token: undefined,
    });
    // generic 422 — don't teach cheaters the exact bounds
    return NextResponse.json({ error: "rejected" }, { status: 422 });
  }
  if (verdict.softFlags.length > 0) {
    // SHADOW MODE: log for tuning, accept the score (see anti-cheat.ts)
    console.warn("score flagged:", verdict.softFlags, {
      uid: user.id,
      ...body,
      token: undefined,
    });
  }

  const admin = createSupabaseAdminClient();

  // --- per-user rate limit (DB-backed — survives serverless statelessness) ---
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000,
  ).toISOString();
  const { count } = await admin
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);
  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // --- previous best (for the celebration flag) ---
  const bestQuery = admin
    .from("scores")
    .select("score, duration_ms")
    .eq("user_id", user.id)
    .eq("mode", body.mode);
  const { data: prevBest } =
    body.mode === "sprint"
      ? await bestQuery.order("duration_ms", { ascending: true }).limit(1).maybeSingle()
      : await bestQuery.order("score", { ascending: false }).limit(1).maybeSingle();

  // --- insert (single-use guarantee via the unique session_id) ---
  const { data: inserted, error } = await admin
    .from("scores")
    .insert({
      user_id: user.id,
      mode: body.mode,
      score: body.score,
      lines: body.lines,
      level: body.level,
      duration_ms: body.duration_ms,
      session_id: token.sid,
      client_version: body.client_version ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // replay of an already-submitted game session
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    console.error("score insert failed:", error.message);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const personalBest =
    !prevBest ||
    (body.mode === "sprint"
      ? body.duration_ms < prevBest.duration_ms
      : body.score > prevBest.score);

  // rank via the security-invoker RPC, as the user (uses auth.uid())
  let rank: number | null = null;
  const { data: rankRows } = await supabase.rpc("get_my_rank", {
    p_mode: body.mode,
  });
  if (Array.isArray(rankRows) && rankRows.length > 0) {
    rank = Number(rankRows[0].rank);
  }

  return NextResponse.json({ id: inserted.id, personalBest, rank });
}
