/**
 * Google スプレッドシート連携(Apps Script Web App 方式)。
 *
 * 設計上の選択:
 *  - 学校現場で OAuth フローを 設定するのは 負担が大きい
 *  - 各クラス(または教員)に Google スプレッドシートを 1 枚だけ 用意してもらい、
 *    Apps Script の 「Web アプリとして デプロイ」で 匿名アクセス可能な
 *    Deployment URL を 得る
 *  - そこに JSON を POST すれば、Apps Script が `appendRow` で 行を追加する
 *  - この設計なら Google API キーも OAuth クライアントも 不要
 *
 * アプリ側(サーバー)では `postToClassSheet()` を呼ぶだけ。失敗しても業務は
 * 止まらない(ログのみ、サイレント fail)。
 */
import { prisma } from '@/lib/prisma';

export type SheetPayload = {
  kind: 'audio' | 'reflection' | 'missing-voice' | 'quiz' | 'stance';
  timestamp: string;
  student: {
    nickname: string | null;
    handle: string | null;
  };
  className: string;
  unitTitle: string | null;
  title: string;
  content: string;
  extra?: Record<string, unknown>;
};

/**
 * 教員が Apps Script エディタに貼り付ける スクリプト。
 * 児童の端末から POST された JSON を スプレッドシートの 1 行目を ヘッダーとして
 * 適切な 列に 追記する。
 *
 * 読みやすさのため、トリプルバッククォートで囲んで README や /teacher/classes/[id]
 * ページで 表示できるように エクスポート。
 */
export const APPS_SCRIPT_TEMPLATE = `/**
 * しらべてつくろう!AIラボ から 児童の 学習記録を 受け取って、
 * このスプレッドシートに 追記する Apps Script。
 *
 * 導入手順:
 *   1. このスクリプトを コピー → Apps Script エディタに 貼り付け
 *   2. SECRET を 英数字で 書き換え(アプリにも 同じ文字列を 入力する)
 *   3. 「デプロイ > 新しいデプロイ > 種類: ウェブアプリ」
 *      - 次のユーザーとして 実行: 自分
 *      - アクセスできるユーザー: 全員
 *   4. 表示された Deployment URL を アプリに 貼り付ける
 */
const SECRET = 'REPLACE_WITH_STRONG_SECRET';  // 書き換えて!
const HEADERS = [
  'timestamp', 'kind', 'student_nickname', 'student_handle',
  'class', 'unit', 'title', 'content', 'extra',
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'invalid secret' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    sheet.appendRow([
      body.timestamp || new Date().toISOString(),
      body.kind || '',
      body.student && body.student.nickname || '',
      body.student && body.student.handle || '',
      body.className || '',
      body.unitTitle || '',
      body.title || '',
      body.content || '',
      body.extra ? JSON.stringify(body.extra) : '',
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('OK');
}
`;

/**
 * 指定 classId の webhook に payload を POST する。
 * - クラスに webhook 未設定、または secret 未設定 → 何もしない
 * - HTTP エラーは サイレントにログのみ(児童体験を 止めない)
 */
export async function postToClassSheet(
  classId: string,
  payload: SheetPayload,
): Promise<void> {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { sheetsWebhookUrl: true, sheetsWebhookSecret: true, name: true },
    });
    if (!cls?.sheetsWebhookUrl || !cls.sheetsWebhookSecret) return;

    const body = JSON.stringify({
      secret: cls.sheetsWebhookSecret,
      ...payload,
      className: payload.className || cls.name,
    });
    const res = await fetch(cls.sheetsWebhookUrl, {
      method: 'POST',
      // Apps Script Web App は GET/POST のみ、JSON で受け取れるよう contents を送る
      headers: { 'content-type': 'application/json' },
      body,
      // 5秒で諦める(児童体験を阻害しない)
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(
        '[sheets] webhook returned',
        res.status,
        await res.text().catch(() => ''),
      );
    }
  } catch (err) {
    console.warn(
      '[sheets] webhook failed:',
      err instanceof Error ? err.message : err,
    );
  }
}

/** 児童から単元 → クラスを引いて、webhook POST するヘルパ。 */
export async function postToUnitSheet(
  unitId: string,
  payload: Omit<SheetPayload, 'className' | 'unitTitle'>,
): Promise<void> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { class: { select: { id: true, name: true } }, title: true },
  });
  if (!unit) return;
  await postToClassSheet(unit.class.id, {
    ...payload,
    className: unit.class.name,
    unitTitle: unit.title,
  });
}

/** 児童の所属クラスに webhook POST するヘルパ(単元に紐付かない録音など)。 */
export async function postToStudentClassSheet(
  studentUserId: string,
  payload: Omit<SheetPayload, 'className' | 'unitTitle'>,
): Promise<void> {
  const membership = await prisma.classMembership.findFirst({
    where: { userId: studentUserId, role: 'student' },
    include: { class: { select: { id: true, name: true } } },
  });
  if (!membership) return;
  await postToClassSheet(membership.class.id, {
    ...payload,
    className: membership.class.name,
    unitTitle: null,
  });
}
