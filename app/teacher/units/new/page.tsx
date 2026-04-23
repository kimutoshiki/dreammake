import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { createUnit } from '@/lib/actions/unit';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: { classId?: string };
}) {
  const { current: user } = await getCurrentTeacher();
  if (!user) return null;
  const classes = await prisma.classMembership.findMany({
    where: { userId: user.id, role: 'teacher' },
    include: { class: true },
  });
  const defaultClassId = searchParams.classId ?? classes[0]?.class.id;
  if (!defaultClassId) redirect('/teacher');

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Card>
        <CardTitle>新しい単元をつくる</CardTitle>
        <form
          action={async (fd) => {
            'use server';
            await createUnit(fd);
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <Label>クラス</Label>
            <select
              name="classId"
              defaultValue={defaultClassId}
              className="w-full rounded-xl border-2 border-kid-ink/10 bg-white px-4 py-3 outline-none focus:border-kid-primary"
            >
              {classes.map((m) => (
                <option key={m.class.id} value={m.class.id}>
                  {m.class.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>単元のタイトル</Label>
            <Input name="title" required maxLength={80} />
          </div>
          <div>
            <Label>中心の問い</Label>
            <Textarea name="themeQuestion" required rows={2} maxLength={200} />
            <p className="mt-1 text-xs text-kid-ink/60">
              例:「この町の未来を決めるとき、だれの声が聞かれていない?」
            </p>
          </div>
          <div>
            <Label>探究の概要(任意)</Label>
            <Textarea name="coreInquiry" rows={3} maxLength={500} />
          </div>
          <div>
            <Label>計画時数</Label>
            <Input
              name="plannedHours"
              type="number"
              min={1}
              max={20}
              defaultValue={12}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="researchMode"
              className="h-5 w-5 accent-kid-primary"
            />
            <span>
              研究モード(ふりかえりと対話ログから
              立ち止まり・共起・エピソードの 派生データを 収集)
            </span>
          </label>

          <Button type="submit" className="w-full">
            単元をつくる
          </Button>
        </form>
      </Card>
    </main>
  );
}
