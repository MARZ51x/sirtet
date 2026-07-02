"use client";

import { useActionState } from "react";
import {
  AuthCard,
  errorCls,
  inputCls,
  labelCls,
  primaryBtnCls,
} from "@/components/AuthCard";
import { updatePasswordAction, type ActionResult } from "@/app/actions/auth";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updatePasswordAction,
    null,
  );

  return (
    <AuthCard title="Set a new password">
      <form action={action} className="flex flex-col gap-4">
        <div>
          <label htmlFor="password" className={labelCls}>
            NEW PASSWORD
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={inputCls}
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
            name="confirm"
            type="password"
            className={inputCls}
            autoComplete="new-password"
            required
          />
        </div>
        {state && !state.ok && (
          <p className={errorCls} role="alert">
            {state.error}
          </p>
        )}
        <button className={primaryBtnCls} disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthCard>
  );
}
