import "server-only";
import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/lib/database.types";

/**
 * Secret-key client. BYPASSES RLS — import only from route handlers / server
 * actions that do their own authorization. Never reachable from client code
 * (enforced by the "server-only" import).
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
