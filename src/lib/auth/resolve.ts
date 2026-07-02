import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { USERNAME_REGEX } from "@/lib/usernames";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolve a login identifier (email OR username) to an email address using
 * the admin client. The result must NEVER reach the client — callers return
 * a uniform "invalid credentials" response when this yields null.
 */
export async function resolveIdentifierToEmail(
  identifier: string,
): Promise<string | null> {
  if (EMAIL_REGEX.test(identifier)) return identifier;
  if (!USERNAME_REGEX.test(identifier)) return null;

  const admin = createSupabaseAdminClient();
  // ilike with escaped wildcards = case-insensitive equality, served by the
  // lower(username) unique index's semantic (usernames are [A-Za-z0-9_] only)
  const escaped = identifier.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", escaped)
    .maybeSingle();
  if (!profile) return null;

  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  if (error || !data.user?.email) return null;
  return data.user.email;
}
