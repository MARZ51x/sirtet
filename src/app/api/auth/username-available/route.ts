import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { USERNAME_REGEX, usernameProblem } from "@/lib/usernames";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("u") ?? "";
  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false, reason: "invalid_format" });
  }
  const problem = usernameProblem(username);
  if (problem) {
    return NextResponse.json({ available: false, reason: problem });
  }
  const admin = createSupabaseAdminClient();
  const escaped = username.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", escaped)
    .maybeSingle();
  return NextResponse.json({
    available: !data,
    reason: data ? "taken" : null,
  });
}
