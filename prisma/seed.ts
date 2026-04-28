/**
 * 児童向けの シードデータ(出席番号 1〜40)。
 * 1 人 1 台の iPad を 前提に、各 iPad は 最初の訪問で 出席番号を 1 回 選ぶ。
 * 以後は Cookie(30 日)で 固定、切替 UI なし。
 *
 * 学校 1 / クラス 1(4年1組)/ 児童 40(handle s-01..s-40、nickname "1 ばん".."40 ばん")/
 * 1 ばんに 見本ボット 1 つ。
 */
import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

// ローカルの dev.db でも、Turso(本番)でも 同じスクリプトで 流せるように
// TURSO_DATABASE_URL が あれば libSQL アダプタ、なければ 標準の PrismaClient。
function makePrisma() {
  if (process.env.TURSO_DATABASE_URL) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter: new PrismaLibSQL(libsql) });
  }
  return new PrismaClient();
}

const prisma = makePrisma();

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

  const studentIds: string[] = [];
  for (let i = 1; i <= 40; i++) {
    const num = String(i).padStart(2, '0');
    const handle = `s-${num}`;
    const nickname = `${i} ばん`;
    const avatarSeed = `k-${num}`;

    const existing = await prisma.user.findUnique({
      where: { handle },
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
    studentIds.push(user.id);
  }

  // 1 ばんに 見本ボット(初回起動時でも空で さびしくないように)
  const firstKidId = studentIds[0]!;
  const bot = await prisma.bot.upsert({
    where: { id: 'demo-bot-town' },
    update: {},
    create: {
      id: 'demo-bot-town',
      ownerId: firstKidId,
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

  console.log('🌱 シード完了(児童 40 人)');
  console.log('');
  console.log('  http://localhost:3000/  → 初回は 番号えらび、2 回目から /kids');
  console.log('  iPad 1 台 = 児童 1 人。番号は Cookie で 固定(30 日)。');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
