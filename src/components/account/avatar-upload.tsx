"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { setAvatar } from "@/actions/account";
import { Avatar } from "@/components/ui/avatar";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function AvatarUpload({ userId, name, url }: { userId: string; name: string; url: string | null }) {
  const t = useTranslations("account");
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return setStatus("error");
    setStatus("busy");
    const path = `${userId}/original-${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error } = await createClient().storage.from("avatars").upload(path, file, { contentType: file.type });
    const result = error ? { ok: false } : await setAvatar(path);
    setStatus(result.ok ? "idle" : "error");
    if (result.ok) router.refresh();
  };

  return (
    <div className="flex items-center gap-5">
      <Avatar name={name} url={url} size={72} />
      <div className="flex flex-col gap-1">
        <label className="btn btn-secondary w-fit cursor-pointer">
          {status === "busy" ? t("avatarUploading") : t("avatarChange")}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={status === "busy"} onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
        {status === "error" && (
          <p role="alert" className="field-error">
            {t("avatarError")}
          </p>
        )}
      </div>
    </div>
  );
}
