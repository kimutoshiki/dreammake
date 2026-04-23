/**
 * 開発・デモ用のシードデータ。
 * `pnpm db:seed` で投入。`pnpm db:reset && pnpm db:seed` で綺麗に入れ直せる。
 *
 * 学校 1 / クラス 1 / 教員 1 / 児童 3 / 中単元 1 / 立場 5 / ボット 1(ナレッジ4枚) を作成。
 *
 * 認証はアプリから外したため、ここではパスワードハッシュを 作成しない。
 * 児童・教員の どちらに なるかは、ブラウザの Cookie による簡易セレクタで決まる
 * (lib/context/kid.ts, lib/context/teacher.ts)。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 シードを開始します…');

  // --- School & Class ---
  const school = await prisma.school.upsert({
    where: { code: 'demo-school' },
    update: {},
    create: {
      code: 'demo-school',
      name: 'デモ小学校',
    },
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

  // --- Teacher ---
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@demo.local' },
    update: {},
    create: {
      email: 'teacher@demo.local',
      role: 'teacher',
      schoolId: school.id,
      nickname: 'せんせい',
    },
  });
  await prisma.classMembership.upsert({
    where: { classId_userId: { classId: klass.id, userId: teacher.id } },
    update: {},
    create: { classId: klass.id, userId: teacher.id, role: 'teacher' },
  });

  // --- Students (3) ---
  const students: Array<{
    handle: string;
    nickname: string;
    avatarSeed: string;
  }> = [
    { handle: 's-4-01-001', nickname: 'みさき', avatarSeed: 'misaki' },
    { handle: 's-4-01-002', nickname: 'たけし', avatarSeed: 'takeshi' },
    { handle: 's-4-01-003', nickname: 'ゆい',   avatarSeed: 'yui' },
  ];

  const studentIds: Record<string, string> = {};
  for (const s of students) {
    const existing = await prisma.user.findUnique({
      where: { handle: s.handle },
      include: { gradeProfile: true },
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

    // 研究参加同意を代行記録
    for (const kind of [
      'llm-usage',
      'class-share',
      'home-use',
      'voice-input',
      'research-participation',
    ]) {
      await prisma.consentRecord.create({
        data: {
          userId: user.id,
          kind,
          granted: true,
          grantedBy: 'guardian',
          notes: 'demo seed: 保護者代行同意',
        },
      });
    }

    studentIds[s.handle] = user.id;
  }

  // --- Unit ---
  const unit = await prisma.unit.upsert({
    where: { id: 'demo-unit-town' },
    update: {},
    create: {
      id: 'demo-unit-town',
      classId: klass.id,
      createdById: teacher.id,
      title: 'わたしたちの町の昔と今',
      themeQuestion: 'この町の未来を決めるとき、だれの声が聞かれていない?',
      coreInquiry:
        '地域の資料と取材から立場を集め、AIの応答と照らしながら「まだ聞こえていない声」を問い続ける。',
      primarySubject: 'social-studies',
      crossCurricular: JSON.stringify(['japanese.writing', 'art.creation', 'inquiry']),
      plannedHours: 12,
      status: 'active',
      researchMode: true,
      ethicsApproval: 'demo seed: 倫理承認は省略',
    },
  });

  // 単元の時数
  const hourPlan = [
    { hourIndex: 1, topic: '導入・問いの共有', aiInsertion: 'none' },
    { hourIndex: 2, topic: '地域資料を読む', aiInsertion: 'before-self' },
    { hourIndex: 3, topic: 'インタビュー計画', aiInsertion: 'none' },
    { hourIndex: 4, topic: '取材と事実整理', aiInsertion: 'none' },
    { hourIndex: 5, topic: '立場マップ初版', aiInsertion: 'none' },
    { hourIndex: 6, topic: '自分の考えをまとめる → AIと突き合わせ', aiInsertion: 'after-self' },
    { hourIndex: 7, topic: '論点の対立整理', aiInsertion: 'none' },
    { hourIndex: 8, topic: 'AI対話で広げる', aiInsertion: 'after-self' },
    { hourIndex: 9, topic: '「声が聞こえていないのはだれ?」を問う', aiInsertion: 'ask-missing' },
    { hourIndex: 10, topic: '少数立場を調べ直す', aiInsertion: 'none' },
    { hourIndex: 11, topic: '表現:動画/まとめ/作文', aiInsertion: 'none' },
    { hourIndex: 12, topic: 'もう一度問う・振り返り', aiInsertion: 'ask-missing' },
  ];
  for (const h of hourPlan) {
    await prisma.unitHour.upsert({
      where: { unitId_hourIndex: { unitId: unit.id, hourIndex: h.hourIndex } },
      update: { topic: h.topic, aiInsertion: h.aiInsertion },
      create: {
        unitId: unit.id,
        hourIndex: h.hourIndex,
        topic: h.topic,
        aiInsertion: h.aiInsertion,
        plannedActivities: '',
      },
    });
  }

  // 立場
  const stancesData = [
    { label: '商店街のお店の人', summary: 'お客が増えて 売上が 上がってほしい。でも 混みすぎると 困ることも。', icon: '🏪' },
    { label: '子育ての家族', summary: 'ベビーカーで 通れる道や、安心して 過ごせる広場が ほしい。', icon: '🚼' },
    { label: '観光で 来る人', summary: '分かりやすい 看板や 案内があると うれしい。', icon: '🗼' },
    { label: '川や生きもの', summary: '話しかけてこないけれど、この町の なかまでもある。', icon: '🐟' },
    { label: 'まだ 生まれていない人', summary: 'これから この町で 暮らす人。今の選択が 未来に 残る。', icon: '🌱' },
  ];
  for (const s of stancesData) {
    await prisma.stance.create({
      data: {
        unitId: unit.id,
        label: s.label,
        summary: s.summary,
        proposedBy: 'teacher',
        proposerUserId: teacher.id,
        icon: s.icon,
      },
    });
  }

  // --- Bot(みさきが作ったことにする)+ ナレッジ ---
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
      topic: 'わたしたちの町の昔と今',
      strengths: '商店街の むかしの ようすと、いまの おみせの ならびが とくい。',
      weaknesses: 'ベビーカーで とおる人の きもちは まだ しらない。',
      isPublic: true,
    },
  });
  await prisma.unitBot.upsert({
    where: { unitId_botId: { unitId: unit.id, botId: bot.id } },
    update: {},
    create: { unitId: unit.id, botId: bot.id, addedBy: 'student' },
  });

  // 出典
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

  const cardInputs = [
    {
      question: '商店街は いつから あるの?',
      answer: '1956年に できたよ。そのときは 食べ物の おみせが たくさん ならんでいたんだ。',
      sourceIds: [src1.id],
    },
    {
      question: '今の おみせは どんな のが 多い?',
      answer: 'パン屋、花屋、本屋、カフェが 多いよ。週末は 家族連れで にぎわうんだ。',
      sourceIds: [src1.id, src2.id],
    },
    {
      question: 'お店の 人は どんな ことで こまっている?',
      answer: '田中さんは 「駐車場が すくなくて 遠くから 来る人が こまっている」と 言っていたよ。',
      sourceIds: [src2.id],
    },
    {
      question: '商店街に 公園は ある?',
      answer: '小さな 広場が 1つ あるよ。でも 遊具は すこし 古くなっているんだ。',
      sourceIds: [src1.id],
    },
  ];
  for (let i = 0; i < cardInputs.length; i++) {
    const c = cardInputs[i]!;
    await prisma.knowledgeCard.create({
      data: {
        botId: bot.id,
        kind: 'qa',
        question: c.question,
        answer: c.answer,
        sourceIds: JSON.stringify(c.sourceIds),
        order: i,
      },
    });
  }

  console.log('🌱 シード完了');
  console.log('');
  console.log('  認証なしで動きます。');
  console.log('  http://localhost:3000/kids      → 児童用(上の切替で 3 人を選択)');
  console.log('  http://localhost:3000/teacher   → 先生用');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
