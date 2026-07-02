import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const supabase = await createSupabaseServerClient();

  // default-template recovery links land here with ?code= (no custom SMTP);
  // token-hash links already established a session via /auth/confirm
  const { code } = await searchParams;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) redirect("/auth/error?reason=recovery");
    redirect("/reset-password"); // clean URL, session cookie now set
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/error?reason=recovery");

  return <ResetPasswordForm />;
}
