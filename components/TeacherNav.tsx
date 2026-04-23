import Link from 'next/link';

type Props = {
  title: string;
  teacherLabel: string;
  backHref?: string;
};

export function TeacherNav({ title, teacherLabel, backHref }: Props) {
  return (
    <header className="border-b border-kid-ink/5 bg-kid-accent/5 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        {backHref ? (
          <Link
            href={backHref}
            className="rounded-full p-2 hover:bg-kid-soft"
            aria-label="戻る"
          >
            ←
          </Link>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-kid-accent/10 text-lg">
            👩‍🏫
          </div>
        )}
        <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
        <span className="rounded-full bg-kid-accent/10 px-3 py-1 text-xs">
          {teacherLabel} · 教員用
        </span>
        <Link
          href="/"
          className="rounded-full px-3 py-1 text-sm text-kid-ink/60 hover:bg-kid-soft"
        >
          トップへ
        </Link>
      </div>
    </header>
  );
}
