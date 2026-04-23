import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';

export default async function NotebookListPage({
  searchParams,
}: {
  searchParams: { unitId?: string };
}) {
  const { current } = await getCurrentKid();
  if (!current) return null;

  // 児童の 所属クラスの 公開単元 一覧(フィルタ用)
  const units = await prisma.unit.findMany({
    where: {
      status: 'active',
      class: {
        memberships: { some: { userId: current.id, role: 'student' } },
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true },
  });

  const filterUnitId = searchParams.unitId;

  const notes = await prisma.fieldNote.findMany({
    where: {
      userId: current.id,
      ...(filterUnitId ? { unitId: filterUnitId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { unit: { select: { title: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">📒 記録ノート</p>
            <CardTitle className="mt-1">取材・観察の きろく</CardTitle>
            <p className="mt-2 text-sm text-kid-ink/70">
              しゃしん・ろくおん・おえかき・ことばを 1 まいの カードに まとめるよ。
              先生の Google ドキュメントに そのまま 出せるよ。
            </p>
          </div>
          <Link
            href="/kids/notebook/new"
            className="rounded-full bg-kid-primary px-4 py-2 text-sm font-medium text-white hover:bg-kid-primary/90"
          >
            ➕ 新しいノート
          </Link>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <FilterChip
          href="/kids/notebook"
          active={!filterUnitId}
          label="ぜんぶ"
        />
        {units.map((u) => (
          <FilterChip
            key={u.id}
            href={`/kids/notebook?unitId=${u.id}`}
            active={filterUnitId === u.id}
            label={u.title}
          />
        ))}
      </div>

      {notes.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-kid-ink/70">
            まだ ノートは ないよ。「➕ 新しいノート」から はじめよう!
          </p>
          <p className="mt-2 text-xs text-kid-ink/60">
            📷 しゃしん・🎙️ ろくおん・🎨 おえかき を さきに つくってから ノートを
            作ると、添付が えらべて 楽しいよ。
          </p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <Link key={n.id} href={`/kids/notebook/${n.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="text-3xl">📒</div>
                  {n.docsUrl && (
                    <span className="rounded-full bg-kid-accent/10 px-2 py-0.5 text-[11px] text-kid-accent">
                      📄 Docs あり
                    </span>
                  )}
                </div>
                <CardTitle className="mt-2 text-base">{n.title}</CardTitle>
                {n.unit && (
                  <p className="mt-1 text-xs text-kid-ink/60">
                    単元: {n.unit.title}
                  </p>
                )}
                {n.locationNote && (
                  <p className="mt-1 text-xs text-kid-ink/60">
                    📍 {n.locationNote}
                  </p>
                )}
                <p className="mt-2 line-clamp-2 text-sm text-kid-ink/80">
                  {n.notes || '(メモなし)'}
                </p>
                <p className="mt-2 text-[11px] text-kid-ink/50">
                  {new Date(n.createdAt).toLocaleString('ja-JP')}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs ${
        active
          ? 'bg-kid-primary text-white'
          : 'bg-kid-soft text-kid-ink/80 hover:bg-kid-primary/20'
      }`}
    >
      {label}
    </Link>
  );
}
