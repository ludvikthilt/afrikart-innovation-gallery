"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateProfile, type ProfileState } from "@/actions/profile";
import { Field } from "@/components/ui/field";
import type { ProfileRow } from "@/types/database";

type Props = {
  profile: Pick<
    ProfileRow,
    "display_name" | "username" | "bio" | "bio_en" | "city" | "country" | "website" | "preferred_locale"
  >;
};

export function ProfileForm({ profile }: Props) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const tl = useTranslations("locale");
  const [state, action, pending] = useActionState(updateProfile, {} as ProfileState);
  const invalid = (field: keyof NonNullable<ProfileState["fieldErrors"]>) =>
    state.fieldErrors?.[field] ? t("errors.invalid") : undefined;

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <Field
        label={t("displayName")}
        name="display_name"
        defaultValue={profile.display_name}
        required
        maxLength={80}
        error={invalid("display_name")}
      />
      <Field
        label={t("username")}
        name="username"
        defaultValue={profile.username ?? ""}
        required
        pattern="[a-z0-9][a-z0-9_\-]{2,29}"
        hint={t("usernameHint")}
        error={state.error === "usernameTaken" ? t("errors.usernameTaken") : invalid("username")}
      />
      <div className="sm:col-span-2">
        <Field label={t("bio")} name="bio" multiline defaultValue={profile.bio ?? ""} maxLength={3000} />
      </div>
      <div className="sm:col-span-2">
        <Field label={t("bioEn")} name="bio_en" multiline lang="en" defaultValue={profile.bio_en ?? ""} maxLength={3000} />
      </div>
      <Field label={t("city")} name="city" defaultValue={profile.city ?? ""} maxLength={80} />
      <Field label={t("country")} name="country" defaultValue={profile.country ?? ""} maxLength={80} />
      <Field
        label={t("website")}
        name="website"
        type="url"
        defaultValue={profile.website ?? ""}
        placeholder="https://"
        error={invalid("website")}
      />
      <div className="field">
        <label htmlFor="preferred_locale" className="field-label">
          {t("language")}
        </label>
        <select id="preferred_locale" name="preferred_locale" defaultValue={profile.preferred_locale} className="field-input">
          <option value="fr">{tl("fr")}</option>
          <option value="en">{tl("en")}</option>
        </select>
      </div>

      <div className="flex items-center gap-4 sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {tc("save")}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {state.ok && <span className="text-status-available">{tc("saved")}</span>}
          {state.error === "generic" && <span className="text-danger">{tc("error")}</span>}
        </p>
      </div>
    </form>
  );
}
