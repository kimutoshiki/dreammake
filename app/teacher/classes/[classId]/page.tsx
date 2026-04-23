import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { Card, CardTitle } from '@/components/ui/Card';
import { SheetsConfigClient } from './SheetsConfigClient';

export default async function TeacherClassPage({
  params,
}: {
  params: { classId: string };
}) {
  const { current: teacher } = await getCurrentTeacher();
  if (!teacher) return null;

  const cls = await prisma.class.findFirst({
    where: {
      id: params.classId,
      memberships: { some: { userId: teacher.id, role: 'teacher' } },
    },
    include: {
      units: { orderBy: { updatedAt: 'desc' } },
      _count: { select: { memberships: true } },
    },
  });
  if (!cls) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">クラス設定</p>
            <CardTitle className="mt-1">{cls.name}</CardTitle>
            <p className="mt-1 text-xs text-kid-ink/60">
              学年 {cls.gradeYear} / 児童 {cls._count.memberships - 1} 人 / 単元 {cls.units.length}
            </p>
          </div>
          <Link
            href="/teacher"
            className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
          >
            ← ダッシュボード
          </Link>
        </div>
      </Card>

      <section className="mt-6">
        <SheetsConfigClient
          classId={cls.id}
          initialUrl={cls.sheetsWebhookUrl ?? ''}
          initialSecret={cls.sheetsWebhookSecret ?? ''}
        />
      </section>

      <section className="mt-6">
        <Card>
          <CardTitle>クラスで つながるリンク</CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link href={`/teacher/classes/${cls.id}/notebook`} className="block">
              <Card className="hover:shadow-md">
                <h3 className="font-semibold">📒 クラスの記録ノート</h3>
                <p className="mt-1 text-sm text-kid-ink/70">
                  取材カード一覧、Docs へ書き出し済みの ノートは 直接開ける
                </p>
              </Card>
            </Link>
            <Link href={`/teacher/classes/${cls.id}/works`} className="block">
              <Card className="hover:shadow-md">
                <h3 className="font-semibold">🗂️ クラスの作品</h3>
                <p className="mt-1 text-sm text-kid-ink/70">
                  児童が 作った 写真・動画・録音・絵・クイズを 一覧で
                </p>
              </Card>
            </Link>
            <Link href={`/teacher/units/new?classId=${cls.id}`} className="block">
              <Card className="hover:shadow-md">
                <h3 className="font-semibold">➕ 新しい単元</h3>
                <p className="mt-1 text-sm text-kid-ink/70">
                  中単元を 設計 + アンケート テンプレ生成
                </p>
              </Card>
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
