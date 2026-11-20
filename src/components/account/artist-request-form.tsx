"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createArtistRequest, type ArtistRequestState } from "@/actions/account";
import { Field } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

type Sample = { path: string; preview: string };

export function ArtistRequestForm({ userId }: { userId: string }) {
  const t = useTranslations("becomeArtist");
  const [state, action, pending] = useActionState(createArtistRequest, {} as ArtistRequestState);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    setUploadError(false);
    const supabase = createClient();
    const added: Sample[] = [];
    for (const file of Array.from(files).slice(0, 5 - samples.length)) {
      if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
        setUploadError(true);
        continue;
      }
      const path = `${userId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage.from("artist-requests").upload(path, file, { contentType: file.type });
      if (error) setUploadError(true);
      else added.push({ path, preview: URL.createObjectURL(file) });
    }
    setSamples((s) => [...s, ...added]);
    setUploading(false);
  };

  if (state.ok) {
    return (
      <p role="status" className="hairline-frame rounded-sm p-5">
        {t("sent")}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="sample_images" value={JSON.stringify(samples.map((s) => s.path))} />
      <Field label={t("motivation")} name="motivation" multiline required minLength={20} maxLength={3000} hint={t("motivationHint")} />
      <Field label={t("links")} name="portfolio_links" multiline hint={t("linksHint")} placeholder="https://" />

      <fieldset className="flex flex-col gap-3">
        <legend className="field-label mb-2">{t("samples")}</legend>
        <p className="field-hint">{t("samplesHint")}</p>
        <ul className="flex flex-wrap gap-3">
          {samples.map((s) => (
            <li key={s.path} className="relative size-24 overflow-hidden rounded-sm border border-hairline-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.preview} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setSamples((list) => list.filter((x) => x.path !== s.path))}
                aria-label={t("remove")}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {samples.length < 5 && (
          <label className="btn btn-secondary w-fit cursor-pointer">
            {uploading ? t("uploading") : t("addSamples")}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => void addFiles(e.target.files)} />
          </label>
        )}
        {uploadError && (
          <p role="alert" className="field-error">
            {t("uploadError")}
          </p>
        )}
      </fieldset>

      {state.error && (
        <p role="alert" className="field-error">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-fit" disabled={pending || uploading || samples.length === 0}>
        {t("submit")}
      </button>
    </form>
  );
}
