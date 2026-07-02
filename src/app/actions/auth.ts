"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { clientEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

const PasswordSchema = z.string().min(8).max(72);

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Sets a new password from the recovery-link session (/reset-password). */
export async function updatePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!PasswordSchema.safeParse(password).success) {
    return { ok: false, error: "Password must be 8–72 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords don't match." };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your reset link expired — request a new one." };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: "Couldn't update the password. Try again." };
  }
  redirect("/");
}

/** Change password while signed in — requires the current password. */
export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!PasswordSchema.safeParse(next).success) {
    return { ok: false, error: "New password must be 8–72 characters." };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { ok: false, error: "Not signed in." };
  }

  // verify the current password with a throwaway client (prevents an
  // unattended-browser hijack; doesn't touch this session's cookies)
  const verifier = createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: wrong } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (wrong) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return { ok: false, error: "Couldn't update the password. Try again." };
  }
  return { ok: true };
}
