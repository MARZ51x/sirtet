import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const Schema = z.object({ password: z.string().min(1).max(72) });

/**
 * Deletes the account after re-verifying the password.
 * Storage does NOT cascade from auth deletes — background objects are removed
 * explicitly first. auth.users -> profiles -> (scores, user_settings) cascade,
 * so the user's leaderboard entries disappear entirely.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // verify the password with a throwaway client so this route can't be used
  // from an unattended browser session
  const verifier = createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: badPassword } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (badPassword) {
    return NextResponse.json({ error: "wrong_password" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  // explicit storage cleanup
  const { data: objects } = await admin.storage
    .from("backgrounds")
    .list(user.id);
  if (objects && objects.length > 0) {
    await admin.storage
      .from("backgrounds")
      .remove(objects.map((o) => `${user.id}/${o.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("account delete failed:", error.message);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
