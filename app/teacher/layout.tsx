import { requireTeacher } from '@/lib/auth/require';
import { Nav } from '@/components/Nav';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireTeacher();
  return (
    <div data-grade="upper">
      <Nav
        title="先生ダッシュボード"
        userLabel={user.nickname ?? user.email ?? '先生'}
        role="teacher"
      />
      {children}
    </div>
  );
}
