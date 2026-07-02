import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";

export const metadata = { title: "Link problem" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const isRecovery = reason === "recovery";

  return (
    <AuthCard title="That link didn't work">
      <p className="mb-4 text-center text-sm text-text-muted">
        {isRecovery
          ? "Your password-reset link is invalid or has expired. Reset links only work once and expire after a short time."
          : "Your confirmation link is invalid or has expired. Links only work once and expire after a short time."}
      </p>
      <div className="flex flex-col gap-2 text-center text-sm">
        <Link
          href="/forgot-password"
          className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-on-accent hover:opacity-90"
        >
          Request a new reset link
        </Link>
        <Link
          href="/login"
          className="text-text-muted hover:text-accent hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
