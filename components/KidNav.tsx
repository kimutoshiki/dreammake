import Link from 'next/link';

type Props = {
  title: string;
  nickname: string;
  backHref?: string;
};

export function KidNav({ title, nickname, backHref }: Props) {
  return (
    <header className="border-b border-kid-ink/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        {backHref ? (
          <Link
            href={backHref}
            className="rounded-full p-2 hover:bg-kid-soft"
            aria-label="もどる"
          >
            ←
          </Link>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-kid-primary/10 text-lg">
            🎒
          </div>
        )}
        <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
        <span className="rounded-full bg-kid-soft px-3 py-1 text-sm">
          <span aria-hidden>👤</span>
          <span className="ml-1">きみは {nickname}</span>
        </span>
      </div>
    </header>
  );
}
