import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';

type Props = {
  title: string;
  userLabel: string;
  role: 'student' | 'teacher';
  backHref?: string;
};

export function Nav({ title, userLabel, role, backHref }: Props) {
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
            📘
          </div>
        )}
        <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
        <span className="hidden text-sm text-kid-ink/60 sm:block">
          {userLabel}
          <span className="ml-2 rounded-full bg-kid-soft px-2 py-0.5 text-xs">
            {role === 'student' ? 'じどう' : 'せんせい'}
          </span>
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full px-3 py-1 text-sm text-kid-ink/60 hover:bg-kid-soft"
          >
            ログアウト
          </button>
        </form>
      </div>
    </header>
  );
}
