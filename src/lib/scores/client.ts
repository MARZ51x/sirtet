import type { ModeId } from "@/game/core/types";

// Client helpers for the server-only score pipeline:
//   POST /api/games/start -> signed session token (auth required)
//   POST /api/scores      -> validated insert (the ONLY score write path)

export interface ScoreSubmitPayload {
  token: string;
  mode: ModeId;
  score: number;
  lines: number;
  level: number;
  duration_ms: number;
  client_version?: string;
}

export interface ScoreSubmitResult {
  id: number;
  personalBest: boolean;
  rank: number | null;
}

export async function startGameSession(mode: ModeId): Promise<string | null> {
  try {
    const res = await fetch("/api/games/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) return null; // 401 = guest — play without a token
    const body = (await res.json()) as { token?: string };
    return body.token ?? null;
  } catch {
    return null;
  }
}

export async function submitScore(
  payload: ScoreSubmitPayload,
): Promise<
  | { ok: true; result: ScoreSubmitResult }
  | { ok: false; status: number | null }
> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = (await res.json()) as ScoreSubmitResult;
        return { ok: true, result };
      }
      // 4xx won't improve on retry
      if (res.status >= 400 && res.status < 500) {
        return { ok: false, status: res.status };
      }
    } catch {
      // network blip — retry once
    }
  }
  return { ok: false, status: null };
}
