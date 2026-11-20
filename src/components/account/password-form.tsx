"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePassword, type PasswordState } from "@/actions/auth";
import { Field } from "@/components/ui/field";

export function PasswordForm() {
  const t = useTranslations("account");
  const [state, action, pending] = useActionState(changePassword, {} as PasswordState);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label={t("newPassword")} name="password" type="password" autoComplete="new-password" required minLength={8} hint={t("passwordHint")} />
      <Field label={t("confirmPassword")} name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {t("changePassword")}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {state.ok && <span className="text-status-available">{t("passwordChanged")}</span>}
          {state.error && <span className="text-danger">{t(`passwordErrors.${state.error}`)}</span>}
        </p>
      </div>
    </form>
  );
}
