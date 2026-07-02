"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { errorCls, inputCls, labelCls } from "@/components/AuthCard";
import {
  changePasswordAction,
  signOutAction,
  type ActionResult,
} from "@/app/actions/auth";

const sectionCls = "mb-6 rounded-lg border border-border bg-surface p-4";
const ghostBtnCls =
  "rounded-lg border border-border bg-surface-2 px-4 py-2 font-semibold text-text hover:border-accent disabled:opacity-50";

export function AccountForms({
  username,
  usernameChangedAt,
}: {
  username: string;
  usernameChangedAt: string | null;
}) {
  const router = useRouter();

  // --- change username ---
  const [newUsername, setNewUsername] = useState(username);
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);
  const [usernameBusy, setUsernameBusy] = useState(false);
  const cooldownUntil = usernameChangedAt
    ? new Date(Date.parse(usernameChangedAt) + 14 * 24 * 60 * 60 * 1000)
    : null;
  const inCooldown = cooldownUntil !== null && cooldownUntil > new Date();

  async function changeUsername(e: React.FormEvent) {
    e.preventDefault();
    setUsernameBusy(true);
    setUsernameMsg(null);
    try {
      const res = await fetch("/api/account/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        nextAllowedAt?: string;
      };
      if (res.ok && body.ok) {
        setUsernameMsg("Username updated ✓");
        router.refresh();
      } else if (body.error === "cooldown" && body.nextAllowedAt) {
        setUsernameMsg(
          `You can change your username again on ${new Date(
            body.nextAllowedAt,
          ).toLocaleDateString()}.`,
        );
      } else if (body.error === "username_taken") {
        setUsernameMsg("That username is taken.");
      } else {
        setUsernameMsg("That username isn't available.");
      }
    } catch {
      setUsernameMsg("Network error — try again.");
    } finally {
      setUsernameBusy(false);
    }
  }

  // --- change password ---
  const [pwState, pwAction, pwPending] = useActionState<
    ActionResult | null,
    FormData
  >(changePasswordAction, null);

  // --- delete account ---
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const body = (await res.json()) as { error?: string };
      setDeleteError(
        body.error === "wrong_password"
          ? "That password is incorrect."
          : "Couldn't delete the account — try again.",
      );
    } catch {
      setDeleteError("Network error — try again.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold tracking-widest text-text-muted">
        ACCOUNT
      </h2>

      <section className={sectionCls}>
        <h3 className="mb-3 font-semibold text-text">Change username</h3>
        <form onSubmit={changeUsername} className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="new-username" className={labelCls}>
              USERNAME
            </label>
            <input
              id="new-username"
              className={inputCls}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              maxLength={20}
              disabled={inCooldown}
              required
            />
          </div>
          <button
            className={ghostBtnCls}
            disabled={usernameBusy || inCooldown || newUsername === username}
          >
            {usernameBusy ? "Saving…" : "Save"}
          </button>
        </form>
        <p className="mt-2 min-h-4 text-xs text-text-muted">
          {inCooldown
            ? `Locked until ${cooldownUntil!.toLocaleDateString()} (one change per 14 days).`
            : (usernameMsg ??
              "One change per 14 days. Old scores show the new name.")}
        </p>
      </section>

      <section className={sectionCls}>
        <h3 className="mb-3 font-semibold text-text">Change password</h3>
        <form action={pwAction} className="flex flex-col gap-3">
          <div>
            <label htmlFor="current" className={labelCls}>
              CURRENT PASSWORD
            </label>
            <input
              id="current"
              name="current"
              type="password"
              className={inputCls}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label htmlFor="next" className={labelCls}>
              NEW PASSWORD
            </label>
            <input
              id="next"
              name="next"
              type="password"
              className={inputCls}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </div>
          {pwState && (
            <p
              className={pwState.ok ? "text-sm text-accent" : errorCls}
              role="status"
            >
              {pwState.ok ? "Password updated ✓" : pwState.error}
            </p>
          )}
          <button className={ghostBtnCls} disabled={pwPending}>
            {pwPending ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>

      <section className={sectionCls}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">Sign out</h3>
          <form action={signOutAction}>
            <button className={ghostBtnCls}>Sign out</button>
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-danger/40 bg-surface p-4">
        <h3 className="mb-1 font-semibold text-danger">Delete account</h3>
        <p className="mb-3 text-sm text-text-muted">
          Permanently removes your account, settings, uploaded background, and{" "}
          <strong className="text-text">
            all of your leaderboard scores
          </strong>
          . This cannot be undone.
        </p>
        {deleteOpen ? (
          <form onSubmit={deleteAccount} className="flex flex-col gap-3">
            <div>
              <label htmlFor="delete-password" className={labelCls}>
                CONFIRM WITH YOUR PASSWORD
              </label>
              <input
                id="delete-password"
                type="password"
                className={inputCls}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {deleteError && (
              <p className={errorCls} role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-danger px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                disabled={deleteBusy}
              >
                {deleteBusy ? "Deleting…" : "Delete forever"}
              </button>
              <button
                type="button"
                className={ghostBtnCls}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="rounded-lg border border-danger/60 px-4 py-2 font-semibold text-danger hover:bg-danger/10"
            onClick={() => setDeleteOpen(true)}
          >
            Delete my account…
          </button>
        )}
      </section>
    </div>
  );
}
