import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USERNAME_REGEX, usernameProblem } from "@/lib/usernames";

const COOLDOWN_DAYS = 14;
const Schema = z.object({ username: z.string().regex(USERNAME_REGEX) });

/** Server-route-only: RLS has no UPDATE policy on profiles, so the cooldown
 *  and reserved list cannot be bypassed from the client. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }
  const username = parsed.data.username;
  const problem = usernameProblem(username);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("username, username_changed_at")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (profile.username === username) {
    return NextResponse.json({ ok: true, username });
  }

  if (profile.username_changed_at) {
    const nextAllowed =
      Date.parse(profile.username_changed_at) +
      COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() < nextAllowed) {
      return NextResponse.json(
        { error: "cooldown", nextAllowedAt: new Date(nextAllowed).toISOString() },
        { status: 409 },
      );
    }
  }

  const escaped = username.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", escaped)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ username, username_changed_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    // unique index is still the race authority
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, username });
}
