import { NextResponse } from "next/server";
import { z } from "zod";
import { clientEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USERNAME_REGEX, usernameProblem } from "@/lib/usernames";

const SignupSchema = z.object({
  email: z.email().max(255),
  // 72 = bcrypt input limit
  password: z.string().min(8).max(72),
  username: z.string().regex(USERNAME_REGEX),
});

export async function POST(request: Request) {
  const parsed = SignupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const { email, password, username } = parsed.data;

  const problem = usernameProblem(username);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  // availability pre-check (UX only — the unique index is the race authority)
  const admin = createSupabaseAdminClient();
  const escaped = username.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", escaped)
    .maybeSingle();
  if (taken) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    // the signup trigger's unique-violation surfaces as this generic message
    if (/database error saving new user/i.test(error.message)) {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    // do not distinguish "email already registered" — Supabase obfuscates it
    console.error("signup error:", error.message);
    return NextResponse.json({ error: "signup_failed" }, { status: 500 });
  }

  // session is non-null when email confirmation is disabled (local dev)
  return NextResponse.json({
    ok: true,
    needsConfirmation: data.session === null,
  });
}
