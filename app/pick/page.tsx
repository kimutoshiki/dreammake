import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSelectedKidId, setSelectedKidId } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';
import { ensureSeeded } from '@/lib/db/ensure-seeded';

/**
 * iPad で 最初に 開いたとき、出席番号を 1 回だけ 選ぶ画面。
 * 選んだら Cookie(30 日)に 出席番号の User.id を 書いて /kids へ。
 */
export default async function PickPage() {
  // 本番 Turso DB が からの 初回 アクセス時 に 自動で 40 人を 投入(冪等)
  await ensureSeeded();

  // すでに Cookie で 出席番号が 固定されているなら ハブへ 戻す
  const picked = await getSelectedKidId();
  if (picked) {
    const exists = await prisma.user.findUnique({ where: { id: picked } });
    if (exists) redirect('/kids');
  }

  const kids = await prisma.user.findMany({
    where: { role: 'student' },
    select: { id: true, handle: true, nickname: true },
    orderBy: { handle: 'asc' },
  });

  async function choose(formData: FormData) {
    'use server';
    const id = String(formData.get('id') ?? '');
    if (!id) return;
    const ok = await prisma.user.findUnique({ where: { id } });
    if (!ok) return;
    setSelectedKidId(id);
    redirect('/kids');
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kid-primary/10 text-2xl">
            🎒
          </div>
          <div>
            <p className="text-xs text-kid-ink/60">しらべてつくろう!AIラボ</p>
            <CardTitle>きみの 出席番号を えらんでね</CardTitle>
          </div>
        </div>
        <p className="mt-3 text-sm text-kid-ink/70">
          iPad 1 台 = きみ 1 人。さいしょに 1 回 えらぶだけで、つぎからは
          そのままで つかえるよ。
        </p>
      </Card>

      <form action={choose}>
        <div className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-8">
          {kids.map((k) => {
            const num = k.handle?.replace(/^s-0*/, '') ?? '?';
            return (
              <button
                key={k.id}
                type="submit"
                name="id"
                value={k.id}
                className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-white text-kid-ink shadow-sm ring-1 ring-kid-ink/5 transition hover:bg-kid-primary/10 hover:shadow-md active:scale-95"
              >
                <span className="text-2xl font-bold">{num}</span>
                <span className="mt-0.5 text-[10px] text-kid-ink/60">ばん</span>
              </button>
            );
          })}
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-kid-ink/50">
        番号を まちがえたら、ハブ画面の 下の「このアプリについて」から
        変えられるよ。
      </p>
    </main>
  );
}
