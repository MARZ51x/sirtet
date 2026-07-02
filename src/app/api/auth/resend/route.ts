import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveIdentifierToEmail } from "@/lib/auth/resolve";
import { clientEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const Schema = z.object({ identifier: z.string().min(3).max(255) });

/** Re-send the signup confirmation email. Uniform response — no enumeration. */
export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const email = await resolveIdentifierToEmail(parsed.data.identifier);
  if (email) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      },
    });
  }
  return NextResponse.json({ ok: true });
}
