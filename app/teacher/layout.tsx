import { notFound } from 'next/navigation';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { TeacherNav } from '@/components/TeacherNav';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { current } = await getCurrentTeacher();
  if (!current) notFound();
  return (
    <div data-grade="upper">
      <TeacherNav
        title="先生のダッシュボード"
        teacherLabel={current.nickname ?? current.email ?? '先生'}
      />
      {children}
    </div>
  );
}
