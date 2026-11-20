import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

type Common = { label: string; hint?: string; error?: string; name: string };
type InputProps = Common & InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type TextareaProps = Common & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };

/** Champ de formulaire accessible : label, aide et erreur reliés par aria. */
export function Field({ label, hint, error, className, ...props }: InputProps | TextareaProps) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const a11y = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {props.multiline ? (
        <textarea {...a11y} {...withoutMultiline(props)} className={`field-input min-h-28 ${className ?? ""}`} />
      ) : (
        <input {...a11y} {...withoutMultiline(props)} className={`field-input ${className ?? ""}`} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function withoutMultiline<T extends { multiline?: boolean }>(props: T): Omit<T, "multiline"> {
  const rest = { ...props };
  delete rest.multiline;
  return rest;
}
