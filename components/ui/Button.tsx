import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    'inline-flex items-center justify-center rounded-2xl px-6 font-medium transition-colors min-h-tap-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kid-primary focus-visible:ring-offset-2 disabled:opacity-50';
  const variants: Record<Variant, string> = {
    primary: 'bg-kid-primary text-white hover:bg-kid-primary/90',
    ghost: 'border-2 border-kid-ink/10 bg-white hover:bg-kid-soft',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest} />
  );
}
