import { requireStudent } from '@/lib/auth/require';
import { Nav } from '@/components/Nav';

export default async function KidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireStudent();
  return (
    <div data-grade={user.gradeProfile?.band ?? 'middle'}>
      <Nav
        title="しらべてつくろう!AIラボ"
        userLabel={user.nickname ?? ''}
        role="student"
      />
      {children}
    </div>
  );
}
