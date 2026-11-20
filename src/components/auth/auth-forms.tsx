"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { sendMagicLink, signIn, signUp, type AuthState } from "@/actions/auth";
import { Field } from "@/components/ui/field";

const initial: AuthState = {};

function Notice({ state }: { state: AuthState }) {
  const t = useTranslations("auth");
  if (state.notice) {
    return (
      <p role="status" className="hairline-frame rounded-sm px-4 py-3 text-sm text-ink">
        {t(state.notice)}
      </p>
    );
  }
  if (state.error) {
    return (
      <p role="alert" className="rounded-sm border border-danger/40 px-4 py-3 text-sm text-danger">
        {t(`errors.${state.error}`)}
      </p>
    );
  }
  return null;
}

export function SignInForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [passwordState, passwordAction, passwordPending] = useActionState(signIn, initial);
  const [linkState, linkAction, linkPending] = useActionState(sendMagicLink, initial);
  const state = linkState.notice || linkState.error || linkState.fieldErrors ? linkState : passwordState;
  const pending = passwordPending || linkPending;
  const errorText = (key: keyof NonNullable<AuthState["fieldErrors"]>) => {
    const code = state.fieldErrors?.[key];
    return code ? t(`errors.${code}`) : undefined;
  };

  return (
    <form action={passwordAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <Notice state={state} />
      <Field
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        error={errorText("email")}
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete="current-password"
        error={errorText("password")}
      />
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {t("submitSignIn")}
      </button>
      <div className="flex items-center gap-3 text-ink-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-hairline-soft" />
        <span className="label-caps">{t("or")}</span>
        <span className="h-px flex-1 bg-hairline-soft" />
      </div>
      <button type="submit" formAction={linkAction} className="btn btn-secondary w-full" disabled={pending}>
        {t("magicLink")}
      </button>
    </form>
  );
}

export function SignUpForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(signUp, initial);
  const errorText = (key: keyof NonNullable<AuthState["fieldErrors"]>) => {
    const code = state.fieldErrors?.[key];
    return code ? t(`errors.${code}`) : undefined;
  };

  if (state.notice === "checkEmail") return <Notice state={state} />;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Notice state={state} />
      <Field
        label={t("displayName")}
        name="displayName"
        autoComplete="name"
        required
        maxLength={80}
        error={errorText("displayName")}
      />
      <Field
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        error={errorText("email")}
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint={t("passwordHint")}
        error={errorText("password")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="field-label mb-2">{t("profileQuestion")}</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["visitor", "artist"] as const).map((p) => (
            <label
              key={p}
              className="flex cursor-pointer flex-col gap-1 rounded-sm border border-hairline p-3 has-[:checked]:border-accent has-[:checked]:bg-accent/5"
            >
              <span className="flex items-center gap-2 font-semibold">
                <input type="radio" name="profile" value={p} defaultChecked={p === "visitor"} className="accent-[var(--color-accent)]" />
                {t(`profile.${p}`)}
              </span>
              <span className="text-xs text-ink-muted">{t(`profile.${p}Hint`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {t("submitSignUp")}
      </button>
    </form>
  );
}
