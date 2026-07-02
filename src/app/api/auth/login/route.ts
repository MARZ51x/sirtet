import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveIdentifierToEmail } from "@/lib/auth/resolve";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  identifier: z.string().min(3).max(255), // email or username
  password: z.string().min(1).max(72),
});

const INVALID = { error: "invalid_credentials" } as const;

export async function POST(request: Request) {
  const parsed = LoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // The resolved email must never reach the client: username lookups happen
  // server-side and every failure path returns the same 401 body.
  const email = await resolveIdentifierToEmail(parsed.data.identifier);
  if (!email) {
    return NextResponse.json(INVALID, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      // lets the UI offer "resend confirmation" — accepted minor tradeoff
      return NextResponse.json({ error: "email_not_confirmed" }, { status: 401 });
    }
    return NextResponse.json(INVALID, { status: 401 });
  }

  // @supabase/ssr wrote the session cookies onto this response
  return NextResponse.json({ ok: true });
}
