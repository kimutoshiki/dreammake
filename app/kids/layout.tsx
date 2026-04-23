import { redirect } from 'next/navigation';
import { getCurrentKid } from '@/lib/context/kid';
import { KidNav } from '@/components/KidNav';

export default async function KidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { current } = await getCurrentKid();
  if (!current) {
    redirect('/pick');
  }

  return (
    <div data-grade={current.gradeProfile?.band ?? 'middle'}>
      <KidNav
        title="しらべてつくろう!AIラボ"
        nickname={current.nickname ?? '?'}
      />
      {children}
    </div>
  );
}
