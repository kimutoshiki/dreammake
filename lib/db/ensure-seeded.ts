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

    // ⚠️ User.gradeProfileId には UNIQUE 制約 が ある(1 ユーザー = 1 プロファイル)。
    // 児童ごとに 別の GradeProfile を 用意する。
    for (let i = 1; i <= 40; i++) {
      const num = String(i).padStart(2, '0');
      const handle = `s-${num}`;
      const nickname = `${i} ばん`;
      const avatarSeed = `k-${num}`;
      // 出席番号ベースの 決定論的 ID。
      // Vercel は インスタンス ごとに /tmp が 別 なので、CUID だと 同じ「12 ばん」でも
      // インスタンスごとに 違う ID に なって Cookie が 通らない。決定論にすれば
      // 全インスタンスで 同じ ID を 共有できる。
      const userId = `kid-${num}`;
      const gradeProfileId = `gp-${num}`;

      try {
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
      } catch (err) {
        if (!/unique constraint/i.test(String(err))) throw err;
      }
      // 並列リクエスト・古い CUID 行と 衝突したら スキップ(冪等)
      try {
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            role: 'student',
            schoolId: school.id,
            handle,
            nickname,
            avatarSeed,
            gradeProfileId,
          },
        });
      } catch (err) {
        if (!/unique constraint/i.test(String(err))) throw err;
      }
      try {
        await prisma.classMembership.upsert({
          where: { classId_userId: { classId: klass.id, userId } },
          update: {},
          create: { classId: klass.id, userId, role: 'student' },
        });
      } catch (err) {
        if (!/unique constraint/i.test(String(err))) throw err;
      }
    }
    console.log('🌱 自動シード完了');
  })();

  try {
    await inProgress;
  } finally {
    inProgress = null;
  }
}
