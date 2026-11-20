"use client";

import { useActionState, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { prepareArtworkImage, saveArtwork, type ArtworkFormState } from "@/actions/studio";
import { Field } from "@/components/ui/field";
import { artworkImageUrl } from "@/lib/images";
import type { ProcessedImage } from "@/lib/image-pipeline";
import { createClient } from "@/lib/supabase/client";
import type { ArtworkRow, CollectionRow } from "@/types/database";

type Props = {
  userId: string;
  artwork?: ArtworkRow;
  collections: Pick<CollectionRow, "id" | "title">[];
};

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 20 * 1024 * 1024;

export function ArtworkForm({ userId, artwork, collections }: Props) {
  const t = useTranslations("studio");
  const [state, action, saving] = useActionState(saveArtwork, {} as ArtworkFormState);
  const [image, setImage] = useState<ProcessedImage | null>(null);
  const [preview, setPreview] = useState<{ url: string; w: number; h: number } | null>(
    artwork ? { url: artworkImageUrl(artwork, "medium"), w: artwork.image_width, h: artwork.image_height } : null,
  );
  const [upload, setUpload] = useState<"idle" | "uploading" | "processing" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [forSale, setForSale] = useState(artwork?.for_sale ?? false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    if (!ACCEPT.includes(file.type)) return setUploadError(t("errors.fileType"));
    if (file.size > MAX_BYTES) return setUploadError(t("errors.fileSize"));

    // Aperçu immédiat, avant même l'envoi.
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setPreview({ url, w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;

    setUpload("uploading");
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/${crypto.randomUUID()}/original.${ext}`;
    const { error } = await createClient().storage.from("artworks").upload(path, file, { contentType: file.type });
    if (error) {
      setUpload("error");
      return setUploadError(t("errors.upload"));
    }
    setUpload("processing");
    const result = await prepareArtworkImage(path);
    if ("error" in result) {
      setUpload("error");
      return setUploadError(t("errors.upload"));
    }
    setImage(result);
    setUpload("idle");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files[0]);
  };

  const fe = (key: string) => {
    const code = state.fieldErrors?.[key];
    if (!code) return undefined;
    return code === "priceRequired" ? t("errors.priceRequired") : code === "imageRequired" ? t("errors.imageRequired") : t("errors.invalidField");
  };
  const busy = upload === "uploading" || upload === "processing";

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-2">
      <input type="hidden" name="id" value={artwork?.id ?? ""} />
      <input type="hidden" name="image" value={image ? JSON.stringify(image) : ""} />

      {/* Colonne gauche : dépôt de l'image et aperçu au mur */}
      <div className="flex flex-col gap-4">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? "border-accent bg-accent/5" : "border-hairline hover:border-accent/60"
          }`}
        >
          <span className="font-serif text-lg">{t("dropzone")}</span>
          <span className="text-sm text-ink-muted">{t("dropzoneHint")}</span>
          <input type="file" accept={ACCEPT.join(",")} className="sr-only" onChange={(e) => void handleFile(e.target.files?.[0])} />
        </label>
        <p role="status" aria-live="polite" className="text-sm text-ink-soft">
          {upload === "uploading" && t("uploading")}
          {upload === "processing" && t("processing")}
          {image && upload === "idle" && t("imageReady")}
        </p>
        {(uploadError || fe("image")) && (
          <p role="alert" className="text-sm text-danger">
            {uploadError ?? fe("image")}
          </p>
        )}

        <figure className="flex flex-col gap-2">
          <figcaption className="label-caps text-ink-muted">{t("wallPreview")}</figcaption>
          <div data-theme="museum" className="relative flex h-80 items-end justify-center overflow-hidden rounded-sm bg-canvas pb-10 [container-type:inline-size]">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_at_50%_0%,rgb(255_255_255/0.95),transparent_65%)]" />
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-8 bg-[#d9d9d5]" />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt=""
                className="relative shadow-frame"
                style={{ aspectRatio: `${preview.w} / ${preview.h}`, height: `min(14rem, calc(70cqw / ${(preview.w / preview.h).toFixed(4)}))` }}
              />
            ) : (
              <span className="relative mb-20 text-sm text-ink-muted">{t("noImage")}</span>
            )}
          </div>
        </figure>
      </div>

      {/* Colonne droite : cartel */}
      <div className="flex flex-col gap-5">
        <Field label={t("fields.title")} name="title" required maxLength={160} defaultValue={artwork?.title} error={fe("title")} />
        <Field label={t("fields.titleEn")} name="title_en" maxLength={160} lang="en" defaultValue={artwork?.title_en ?? ""} />
        <Field label={t("fields.description")} name="description" multiline maxLength={5000} defaultValue={artwork?.description ?? ""} />
        <Field label={t("fields.descriptionEn")} name="description_en" multiline lang="en" maxLength={5000} defaultValue={artwork?.description_en ?? ""} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("fields.year")} name="year" type="number" inputMode="numeric" min={1000} max={2100} defaultValue={artwork?.year ?? ""} error={fe("year")} />
          <Field label={t("fields.dimensions")} name="dimensions" maxLength={80} placeholder="120 × 90 cm" defaultValue={artwork?.dimensions ?? ""} />
          <Field label={t("fields.medium")} name="medium" maxLength={160} defaultValue={artwork?.medium ?? ""} />
          <Field label={t("fields.mediumEn")} name="medium_en" lang="en" maxLength={160} defaultValue={artwork?.medium_en ?? ""} />
        </div>
        <Field label={t("fields.alt")} name="image_alt" maxLength={300} hint={t("fields.altHint")} defaultValue={artwork?.image_alt ?? ""} />
        <div className="field">
          <label htmlFor="collection_id" className="field-label">
            {t("fields.collection")}
          </label>
          <select id="collection_id" name="collection_id" defaultValue={artwork?.collection_id ?? ""} className="field-input">
            <option value="">{t("fields.noCollection")}</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-col gap-4 rounded-sm border border-hairline-soft p-4">
          <legend className="label-caps px-1 text-ink-soft">{t("sale")}</legend>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="for_sale" checked={forSale} onChange={(e) => setForSale(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
            {t("fields.forSale")}
          </label>
          {forSale && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("fields.price")}
                name="price"
                inputMode="numeric"
                required
                defaultValue={artwork?.price ?? ""}
                error={fe("price")}
              />
              <div className="field">
                <label htmlFor="sale_status" className="field-label">
                  {t("fields.status")}
                </label>
                <select
                  id="sale_status"
                  name="sale_status"
                  defaultValue={artwork && artwork.sale_status !== "not_for_sale" ? artwork.sale_status : "available"}
                  className="field-input"
                >
                  <option value="available">{t("status.available")}</option>
                  <option value="reserved">{t("status.reserved")}</option>
                  <option value="sold">{t("status.sold")}</option>
                </select>
              </div>
            </div>
          )}
        </fieldset>

        <label className="flex items-center gap-3">
          <input type="checkbox" name="is_published" defaultChecked={artwork?.is_published ?? false} className="size-5 accent-[var(--color-accent)]" />
          {t("fields.publish")}
        </label>

        {state.error && state.error !== "invalid" && (
          <p role="alert" className="text-sm text-danger">
            {t("errors.save")}
          </p>
        )}
        <div className="flex flex-wrap gap-3 border-t border-hairline-soft pt-5">
          <button type="submit" className="btn btn-primary" disabled={saving || busy}>
            {artwork ? t("save") : t("create")}
          </button>
        </div>
      </div>
    </form>
  );
}
