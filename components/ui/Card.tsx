import type { HTMLAttributes } from 'react';

export function Card({
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-kid-ink/5 ${className}`}
      {...rest}
    />
  );
}

export function CardTitle({
  className = '',
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-xl font-semibold ${className}`} {...rest} />;
}
