import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage() {
  // the recovery link established a session via /auth/confirm
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/error?reason=recovery");

  return <ResetPasswordForm />;
}
