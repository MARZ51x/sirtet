import { NextResponse } from "next/server";
import { z } from "zod";
import { mintGameToken } from "@/lib/game-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const Schema = z.object({ mode: z.enum(["marathon", "sprint", "ultra"]) });

/** Mints a signed single-use game-session token. Auth required (guests 401). */
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
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  return NextResponse.json({
    token: mintGameToken(user.id, parsed.data.mode),
  });
}
