"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = {
  ok?: boolean;
  error?: "invalid" | "usernameTaken" | "generic";
  fieldErrors?: Partial<Record<keyof ProfileInput, string>>;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_-]{2,29}$/),
  bio: optionalText(3000),
  bio_en: optionalText(3000),
  city: optionalText(80),
  country: optionalText(80),
  website: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null)
    .pipe(z.url({ protocol: /^https?$/ }).nullable()),
  preferred_locale: z.enum(["fr", "en"]),
});

type ProfileInput = z.input<typeof profileSchema>;

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: ProfileState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as keyof ProfileInput] = issue.code;
    }
    return { error: "invalid", fieldErrors };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "generic" };

  // Le rôle n'est jamais envoyé : il est de toute façon protégé en base.
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  if (error) return { error: error.code === "23505" ? "usernameTaken" : "generic" };

  revalidatePath("/", "layout");
  return { ok: true };
}
