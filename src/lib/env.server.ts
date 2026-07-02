import "server-only";
import { z } from "zod";

// Server-only secrets. Parsed lazily (route handlers run at request time) and
// memoized; a missing/invalid value fails loudly on first use.
const ServerEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
  GAME_SESSION_SECRET: z.string().min(32),
});

type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (!cached) {
    cached = ServerEnvSchema.parse({
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      GAME_SESSION_SECRET: process.env.GAME_SESSION_SECRET,
    });
  }
  return cached;
}
