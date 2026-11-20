"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveExhibition, type ExhibitionFormState } from "@/actions/admin";
import { Field } from "@/components/ui/field";
import type { ExhibitionRow } from "@/types/database";

export function ExhibitionForm({ exhibition }: { exhibition?: ExhibitionRow }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(saveExhibition, {} as ExhibitionFormState);
  const bad = (field: string) => (state.fields?.includes(field) ? t("invalidField") : undefined);

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="id" value={exhibition?.id ?? ""} />
      <Field label={t("fields.title")} name="title" required maxLength={160} defaultValue={exhibition?.title} error={bad("title")} />
      <Field label={t("fields.titleEn")} name="title_en" lang="en" maxLength={160} defaultValue={exhibition?.title_en ?? ""} />
      <Field
        label={t("fields.slug")}
        name="slug"
        defaultValue={exhibition?.slug ?? ""}
        hint={t("fields.slugHint")}
        error={state.error === "slug" ? t("slugTaken") : undefined}
      />
      <div className="field">
        <label htmlFor="room_theme" className="field-label">
          {t("fields.theme")}
        </label>
        <select id="room_theme" name="room_theme" defaultValue={exhibition?.room_theme ?? "dark"} className="field-input">
          <option value="dark">{t("theme.dark")}</option>
          <option value="museum">{t("theme.museum")}</option>
        </select>
      </div>
      <Field label={t("fields.startsAt")} name="starts_at" type="date" required defaultValue={exhibition?.starts_at} error={bad("starts_at")} />
      <Field label={t("fields.endsAt")} name="ends_at" type="date" required defaultValue={exhibition?.ends_at} error={bad("ends_at")} />
      <div className="sm:col-span-2">
        <Field label={t("fields.curatorial")} name="curatorial_text" multiline maxLength={8000} defaultValue={exhibition?.curatorial_text ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Field label={t("fields.curatorialEn")} name="curatorial_text_en" lang="en" multiline maxLength={8000} defaultValue={exhibition?.curatorial_text_en ?? ""} />
      </div>
      <label className="flex items-center gap-3">
        <input type="checkbox" name="is_published" defaultChecked={exhibition?.is_published ?? false} className="size-5 accent-[var(--color-accent)]" />
        {t("fields.published")}
      </label>
      <label className="flex items-center gap-3">
        <input type="checkbox" name="is_current" defaultChecked={exhibition?.is_current ?? false} className="size-5 accent-[var(--color-accent)]" />
        {t("fields.current")}
      </label>
      {bad("is_current") && <p className="field-error sm:col-span-2">{t("currentNeedsPublished")}</p>}
      <div className="flex items-center gap-4 sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {exhibition ? tc("save") : t("createExhibition")}
        </button>
        <p role="status" className="text-sm">
          {state.ok && <span className="text-status-available">{tc("saved")}</span>}
          {state.error === "generic" && <span className="text-danger">{tc("error")}</span>}
        </p>
      </div>
    </form>
  );
}
