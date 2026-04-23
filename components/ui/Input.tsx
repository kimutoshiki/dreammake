import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Input({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border-2 border-kid-ink/10 bg-white px-4 py-3 outline-none transition-colors focus:border-kid-primary ${className}`}
      {...rest}
    />
  );
}

export function Textarea({
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border-2 border-kid-ink/10 bg-white px-4 py-3 outline-none transition-colors focus:border-kid-primary ${className}`}
      {...rest}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-medium text-kid-ink/70">
      {children}
    </label>
  );
}
