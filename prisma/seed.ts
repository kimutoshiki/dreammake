/**
 * 児童向け縮小版の シードデータ。
 * `pnpm db:seed` で 投入。教員アカウント・単元・立場・アンケートなどは 作らない。
 *
 * 学校 1 / クラス 1 / 児童 3 / 児童の 1 つ目のボット(ナレッジ 4 枚)を作る。
 * 認証は なし、ブラウザの Cookie セレクタで 児童を 切り替える。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 シードを開始します…');

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

  const students = [
    { handle: 's-4-01-001', nickname: 'みさき', avatarSeed: 'misaki' },
    { handle: 's-4-01-002', nickname: 'たけし', avatarSeed: 'takeshi' },
    { handle: 's-4-01-003', nickname: 'ゆい', avatarSeed: 'yui' },
  ];

  const studentIds: Record<string, string> = {};
  for (const s of students) {
    const existing = await prisma.user.findUnique({
      where: { handle: s.handle },
    });
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
      where: { handle: s.handle },
      update: {},
      create: {
        role: 'student',
        schoolId: school.id,
        handle: s.handle,
        nickname: s.nickname,
        avatarSeed: s.avatarSeed,
        gradeProfileId,
      },
    });
    await prisma.classMembership.upsert({
      where: { classId_userId: { classId: klass.id, userId: user.id } },
      update: {},
      create: { classId: klass.id, userId: user.id, role: 'student' },
    });
    studentIds[s.handle] = user.id;
  }

  // みさきに 見本ボットを 作る(新しい児童が 空でも さびしくないように)
  const misakiId = studentIds['s-4-01-001']!;
  const bot = await prisma.bot.upsert({
    where: { id: 'demo-bot-town' },
    update: {},
    create: {
      id: 'demo-bot-town',
      ownerId: misakiId,
      classId: klass.id,
      name: '町はかせ',
      avatarSeed: 'machi-hakase',
      persona: 'scholar',
      topic: 'わたしたちの町',
      strengths: '商店街の むかしの ようすや、いまの おみせの ならびが とくい。',
      weaknesses: 'まだ しらべていない ことも たくさん あるよ。',
      isPublic: false,
    },
  });

  // ナレッジと 出典の サンプル(出典は 任意、この例では つけている)
  const existingCards = await prisma.knowledgeCard.count({
    where: { botId: bot.id },
  });
  if (existingCards === 0) {
    const src1 = await prisma.source.create({
      data: {
        botId: bot.id,
        kind: 'book',
        title: '『わたしたちの町の歴史』',
        authorOrWho: '図書館の資料集',
      },
    });
    const src2 = await prisma.source.create({
      data: {
        botId: bot.id,
        kind: 'interview',
        title: '商店街の田中さんへの取材',
        authorOrWho: '田中さん(商店会)',
      },
    });
    const cards = [
      {
        q: '商店街は いつから ある?',
        a: '1956年に できたよ。そのときは 食べ物の おみせが たくさん ならんでいたんだ。',
        srcs: [src1.id],
      },
      {
        q: '今の おみせは どんな のが 多い?',
        a: 'パン屋、花屋、本屋、カフェが 多いよ。週末は 家族連れで にぎわうよ。',
        srcs: [src1.id, src2.id],
      },
      {
        q: 'お店の 人は どんな ことで こまっている?',
        a: '田中さんは「駐車場が すくなくて 遠くから 来る人が こまっている」と 言っていたよ。',
        srcs: [src2.id],
      },
      {
        q: '商店街に 公園は ある?',
        a: '小さな 広場が 1つ あるよ。でも 遊具は すこし 古くなっているんだ。',
        srcs: [src1.id],
      },
    ];
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]!;
      await prisma.knowledgeCard.create({
        data: {
          botId: bot.id,
          kind: 'qa',
          question: c.q,
          answer: c.a,
          sourceIds: JSON.stringify(c.srcs),
          order: i,
        },
      });
    }
  }

  console.log('🌱 シード完了');
  console.log('');
  console.log('  http://localhost:3000/kids   → こどもの ページ(右上 で 3 人を 切替)');
  console.log('  認証は ありません。クラスの iPad で そのまま 開いて 使えます。');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
