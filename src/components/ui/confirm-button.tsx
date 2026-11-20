"use client";

import type { ButtonHTMLAttributes } from "react";

/** Bouton d'envoi qui demande confirmation (suppression, refus…). */
export function ConfirmButton({ message, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
