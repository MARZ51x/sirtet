"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AuthCard,
  errorCls,
  inputCls,
  labelCls,
  primaryBtnCls,
} from "@/components/AuthCard";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnconfirmed(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (res.ok) {
        router.push(searchParams.get("next") ?? "/");
        router.refresh();
        return;
      }
      const body = (await res.json()) as { error?: string };
      if (body.error === "email_not_confirmed") {
        setUnconfirmed(true);
        setError("Your email isn't confirmed yet.");
      } else {
        setError("Invalid credentials.");
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResent(true);
    await fetch("/api/auth/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    }).catch(() => {});
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={submit} className="flex flex-col gap-4">
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
        <div>
          <label htmlFor="password" className={labelCls}>
            PASSWORD
          </label>
          <input
            id="password"
            type="password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <p className={errorCls} role="alert">
            {error}{" "}
            {unconfirmed &&
              (resent ? (
                <span className="text-text-muted">Confirmation re-sent.</span>
              ) : (
                <button
                  type="button"
                  onClick={resend}
                  className="text-accent underline underline-offset-4"
                >
                  Resend confirmation
                </button>
              ))}
          </p>
        )}
        <button className={primaryBtnCls} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-4 flex flex-col gap-1 text-center text-sm text-text-muted">
        <Link
          href="/forgot-password"
          className="hover:text-accent hover:underline"
        >
          Forgot your password?
        </Link>
        <span>
          New here?{" "}
          <Link
            href="/signup"
            className="text-accent underline underline-offset-4"
          >
            Create an account
          </Link>
        </span>
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
