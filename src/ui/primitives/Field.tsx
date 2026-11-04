import type { InputHTMLAttributes } from 'react';

export function Field({ label, id, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-subhead text-text-secondary">{label}</span>
      <input
        id={id}
        className="min-h-11 w-full rounded-control border border-surface-border bg-surface px-4 text-body text-text-primary outline-none focus:border-accent"
        {...rest}
      />
      {hint && <span className="mt-1 block text-footnote text-text-secondary">{hint}</span>}
    </label>
  );
}
