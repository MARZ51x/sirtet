"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AuthCard,
  inputCls,
  labelCls,
  primaryBtnCls,
} from "@/components/AuthCard";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    }).catch(() => {});
    setLoading(false);
    setSent(true); // uniform copy regardless of outcome — no enumeration
  }

  return (
    <AuthCard title="Reset password">
      {sent ? (
        <p className="text-center text-sm text-text-muted">
          If an account exists for that email or username, we sent a reset
          link. Check your inbox, then follow the link to set a new password.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Enter your email or username and we&apos;ll send you a link to set
            a new password.
          </p>
          <div>
            <label htmlFor="identifier" className={labelCls}>
              EMAIL OR USERNAME
            </label>
            <input
              id="identifier"
              className={inputCls}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <button className={primaryBtnCls} disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-text-muted">
        <Link href="/login" className="text-accent underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
