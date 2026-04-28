/**
 * 初回 デプロイ後の Turso DB が からの 時に、自動で 40 人の 児童を 流し込む。
 * 同時 リクエストでの 重複生成を 防ぐため、小さな ロックを 使う。
 *
 * 本番(Vercel + Turso)で seed コマンドを 手で 流せない 環境用の セーフティネット。
 * ローカル dev は 既存の `pnpm db:seed` で OK。
 */
import { prisma } from '@/lib/prisma';
import { migrateLibsql } from '@/lib/db/migrate-libsql';

let inProgress: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (inProgress) return inProgress;

  inProgress = (async () => {
    // Vercel 等の サーバレス環境で TURSO_DATABASE_URL を 使う 場合、
    // 初回 起動時に スキーマ migrations を 流す(冪等)。
    if (process.env.TURSO_DATABASE_URL) {
      try {
        await migrateLibsql(
          process.env.TURSO_DATABASE_URL,
          process.env.TURSO_AUTH_TOKEN,
        );
      } catch (err) {
        console.error('libSQL migration failed:', err);
        // 既に 適用済みの 可能性が あるので 続行
      }
    }

    const userCount = await prisma.user.count({ where: { role: 'student' } });
    if (userCount > 0) return;

    console.log('🌱 自動シード開始(出席番号 1〜40)…');

    const school = await prisma.school.upsert({
      where: { code: 'demo-school' },
      update: {},
      create: { code: 'demo-school', name: 'デモ小学校' },
    });

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

    for (let i = 1; i <= 40; i++) {
      const num = String(i).padStart(2, '0');
      const handle = `s-${num}`;
      const nickname = `${i} ばん`;
      const avatarSeed = `k-${num}`;

      const existing = await prisma.user.findUnique({ where: { handle } });
      let gradeProfileId = existing?.gradeProfileId ?? null;
      if (!gradeProfileId) {
        const gp = await prisma.gradeProfile.create({
          data: {
            band: 'middle',
            gradeYear: 4,
            furiganaMode: 'above-grade',
            voiceFirst: false,
            maxQaChars: 200,
          },
        });
        gradeProfileId = gp.id;
      }
      const user = await prisma.user.upsert({
        where: { handle },
        update: {},
        create: {
          role: 'student',
          schoolId: school.id,
          handle,
          nickname,
          avatarSeed,
          gradeProfileId,
        },
      });
      await prisma.classMembership.upsert({
        where: { classId_userId: { classId: klass.id, userId: user.id } },
        update: {},
        create: { classId: klass.id, userId: user.id, role: 'student' },
      });
    }
    console.log('🌱 自動シード完了');
  })();

  try {
    await inProgress;
  } finally {
    inProgress = null;
  }
}
