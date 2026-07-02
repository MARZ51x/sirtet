import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import type { ModeId } from "@/game/core/types";

// Server-signed game-session token: cheap ground truth for wall-clock duration
// and single-use score submissions (sid is UNIQUE in scores). No DB writes.

export interface GameToken {
  sid: string;
  uid: string;
  mode: ModeId;
  iat: number; // epoch ms
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function hmac(payload: string): Buffer {
  return createHmac("sha256", serverEnv().GAME_SESSION_SECRET)
    .update(payload)
    .digest();
}

export function mintGameToken(uid: string, mode: ModeId): string {
  const token: GameToken = { sid: randomUUID(), uid, mode, iat: Date.now() };
  const payload = b64url(Buffer.from(JSON.stringify(token), "utf8"));
  return `${payload}.${b64url(hmac(payload))}`;
}

export function verifyGameToken(raw: string): GameToken | null {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || raw.length > 512) return null;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  let given: Buffer;
  try {
    given = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  const expected = hmac(payload);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as GameToken;
    if (
      typeof parsed.sid !== "string" ||
      typeof parsed.uid !== "string" ||
      typeof parsed.iat !== "number" ||
      !["marathon", "sprint", "ultra"].includes(parsed.mode)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
