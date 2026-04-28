import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL!;
const libsql = createClient({ url });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Same logic as ensureSeeded, executed inline to find any error
  console.log('count before:', await prisma.user.count());

  const school = await prisma.school.upsert({
    where: { code: 'demo-school' },
    update: {},
    create: { code: 'demo-school', name: 'デモ小学校' },
  });
  console.log('school:', school.id);

  const klass = await prisma.class.upsert({
    where: { id: 'demo-class' },
    update: {},
    create: {
      id: 'demo-class',
      schoolId: school.id,
      name: '4年1組',
      gradeYear: 4,
      defaultGrade: 'middle',
    },
  });
  console.log('class:', klass.id);

  for (let i = 1; i <= 3; i++) {
    const num = String(i).padStart(2, '0');
    const userId = `kid-${num}`;
    const gradeProfileId = `gp-${num}`;
    await prisma.gradeProfile.upsert({
      where: { id: gradeProfileId },
      update: {},
      create: {
        id: gradeProfileId,
        band: 'middle',
        gradeYear: 4,
        furiganaMode: 'above-grade',
        voiceFirst: false,
        maxQaChars: 200,
      },
    });
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        role: 'student',
        schoolId: school.id,
        handle: `s-${num}`,
        nickname: `${i} ばん`,
        avatarSeed: `k-${num}`,
        gradeProfileId,
      },
    });
    await prisma.classMembership.upsert({
      where: { classId_userId: { classId: klass.id, userId } },
      update: {},
      create: { classId: klass.id, userId, role: 'student' },
    });
    console.log('seeded kid-', num);
  }
  console.log('count after:', await prisma.user.count());
}
main().catch(e => { console.error('FAIL:', e); process.exit(1); }).finally(() => prisma.$disconnect());
