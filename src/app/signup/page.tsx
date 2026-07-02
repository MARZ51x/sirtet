"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AuthCard,
  errorCls,
  inputCls,
  labelCls,
  primaryBtnCls,
} from "@/components/AuthCard";
import { USERNAME_REGEX } from "@/lib/usernames";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // async availability result, tagged with the name it answers for
  const [checked, setChecked] = useState<{
    name: string;
    available: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatOk = USERNAME_REGEX.test(username);
  const availability = !username
    ? "unknown"
    : !formatOk
      ? "invalid"
      : checked?.name === username
        ? checked.available
          ? "available"
          : "taken"
        : "checking";

  // debounced inline username availability (setState only in async callbacks)
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!username || !USERNAME_REGEX.test(username)) return;
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/username-available?u=${encodeURIComponent(username)}`,
        );
        const body = (await res.json()) as { available: boolean };
        setChecked({ name: username, available: body.available });
      } catch {
        // stays "checking" — the server re-validates on submit anyway
      }
    }, 500);
  }, [username]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        needsConfirmation?: boolean;
        error?: string;
      };
      if (res.ok && body.ok) {
        if (body.needsConfirmation) {
          setCheckEmail(true);
        } else {
          router.push("/");
          router.refresh();
        }
        return;
      }
      setError(
        body.error === "username_taken"
          ? "That username is taken."
          : body.error === "reserved" || body.error === "not_allowed"
            ? "That username isn't available."
            : body.error === "rate_limited"
              ? "Too many attempts — try again in a bit."
              : "Sign-up failed. Check your details and try again.",
      );
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthCard title="Check your email">
        <p className="text-center text-sm text-text-muted">
          We sent a confirmation link to{" "}
          <span className="font-semibold text-text">{email}</span>. Click it to
          activate your account, then{" "}
          <Link
            href="/login"
            className="text-accent underline underline-offset-4"
          >
            sign in
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create account">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="username" className={labelCls}>
            USERNAME
          </label>
          <input
            id="username"
            className={inputCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={20}
            required
            aria-describedby="username-status"
          />
          <p id="username-status" className="mt-1 min-h-4 text-xs">
            {availability === "invalid" && (
              <span className="text-danger">
                3–20 characters: letters, numbers, underscore.
              </span>
            )}
            {availability === "taken" && (
              <span className="text-danger">Not available.</span>
            )}
            {availability === "available" && (
              <span className="text-accent">Available ✓</span>
            )}
            {availability === "checking" && (
              <span className="text-text-muted">Checking…</span>
            )}
          </p>
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>
            EMAIL
          </label>
          <input
            id="email"
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
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
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
        </div>
        <div>
          <label htmlFor="confirm" className={labelCls}>
            CONFIRM PASSWORD
          </label>
          <input
            id="confirm"
            type="password"
            className={inputCls}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        {error && (
          <p className={errorCls} role="alert">
            {error}
          </p>
        )}
        <button
          className={primaryBtnCls}
          disabled={loading || availability === "taken"}
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
