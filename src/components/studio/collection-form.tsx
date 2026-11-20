"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveCollection, type CollectionFormState } from "@/actions/studio";
import { Field } from "@/components/ui/field";
import type { CollectionRow } from "@/types/database";

type Props = {
  collection?: Pick<CollectionRow, "id" | "title" | "description" | "description_en" | "year" | "is_published" | "cover_artwork_id">;
  artworks: { id: string; title: string }[];
};

export function CollectionForm({ collection, artworks }: Props) {
  const t = useTranslations("studio");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(saveCollection, {} as CollectionFormState);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={collection?.id ?? ""} />
      <Field label={t("fields.title")} name="title" required maxLength={160} defaultValue={collection?.title} />
      <Field label={t("fields.year")} name="year" type="number" min={1900} max={2100} defaultValue={collection?.year ?? ""} />
      <div className="sm:col-span-2">
        <Field label={t("fields.description")} name="description" multiline maxLength={5000} defaultValue={collection?.description ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Field label={t("fields.descriptionEn")} name="description_en" lang="en" multiline maxLength={5000} defaultValue={collection?.description_en ?? ""} />
      </div>
      {collection && (
        <div className="field">
          <label htmlFor={`cover-${collection.id}`} className="field-label">
            {t("fields.cover")}
          </label>
          <select id={`cover-${collection.id}`} name="cover_artwork_id" defaultValue={collection.cover_artwork_id ?? ""} className="field-input">
            <option value="">—</option>
            {artworks.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className="flex items-center gap-3 self-end pb-3">
        <input type="checkbox" name="is_published" defaultChecked={collection?.is_published ?? true} className="size-5 accent-[var(--color-accent)]" />
        {t("fields.publish")}
      </label>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {collection ? tc("save") : t("createCollection")}
        </button>
        <p role="status" className="text-sm">
          {state.ok && <span className="text-status-available">{tc("saved")}</span>}
          {state.error && <span className="text-danger">{t("errors.save")}</span>}
        </p>
      </div>
    </form>
  );
}
