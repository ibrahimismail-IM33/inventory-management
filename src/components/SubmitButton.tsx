"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that reflects the parent form's pending state — disables and
 * shows a working label while the Server Action runs, so clicks feel responsive.
 */
export function SubmitButton({
  children,
  pendingText = "Working…",
  className = "rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  );
}
