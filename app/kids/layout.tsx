import { notFound } from 'next/navigation';
import { getCurrentKid } from '@/lib/context/kid';
import { KidNav } from '@/components/KidNav';

export default async function KidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { current, allKids } = await getCurrentKid();
  if (!current) {
    // 児童が DB に 1 人もいない → シード未実行
    notFound();
  }

  return (
    <div data-grade={current.gradeProfile?.band ?? 'middle'}>
      <KidNav
        title="しらべてつくろう!AIラボ"
        currentKidId={current.id}
        kids={allKids}
      />
      {children}
    </div>
  );
}
