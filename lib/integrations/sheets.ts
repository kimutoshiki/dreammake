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
 * しらべてつくろう!AIラボ から 児童の 学習記録と 記録ノートを 受け取って、
 *  - 学習記録(ふりかえり・立場・声の仮説・録音+文字おこし) → スプレッドシートに 追記
 *  - 記録ノート(field-note) → 新しい Google ドキュメントを 作成(先生の Drive に 保存)
 * を 行う Apps Script。
 *
 * 導入手順:
 *   1. このスクリプトを コピー → Apps Script エディタに 貼り付け
 *   2. SECRET を 英数字で 書き換え(アプリにも 同じ文字列を 入力する)
 *   3. 「デプロイ > 新しいデプロイ > 種類: ウェブアプリ」
 *      - 次のユーザーとして 実行: 自分
 *      - アクセスできるユーザー: 全員
 *   4. 表示された Deployment URL を アプリに 貼り付ける
 *
 * 既にこのスクリプトを 使っている場合(Sheets 連携のみ) → 本文を 貼り替えて、
 * 「デプロイの管理 → 編集 → 新しいバージョン」で 再デプロイ。
 * 初回のみ DocumentApp の 追加スコープ許可が 要求されます。URL は 変わりません。
 */
const SECRET = 'REPLACE_WITH_STRONG_SECRET';  // 書き換えて!
const HEADERS = [
  'timestamp', 'kind', 'student_nickname', 'student_handle',
  'class', 'unit', 'title', 'content', 'extra',
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return jsonOut({ ok: false, error: 'invalid secret' });
    if (body.kind === 'field-note') return handleFieldNote(body);
    return handleSheetRow(body);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doGet() {
  return ContentService.createTextOutput('OK');
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleSheetRow(body) {
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
  return jsonOut({ ok: true });
}

function handleFieldNote(body) {
  const title = body.title || '無題';
  const doc = DocumentApp.create('記録ノート: ' + title);
  const b = doc.getBody();
  b.appendParagraph('📒 ' + title)
   .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  const metaLines = [];
  if (body.student && body.student.nickname) metaLines.push('児童: ' + body.student.nickname);
  if (body.timestamp) metaLines.push('日時: ' + body.timestamp);
  if (body.className) metaLines.push('クラス: ' + body.className);
  if (body.unitTitle) metaLines.push('単元: ' + body.unitTitle);
  if (body.locationNote) metaLines.push('場所: ' + body.locationNote);
  metaLines.forEach(function (l) { b.appendParagraph(l); });
  b.appendParagraph('');
  if (body.notes) {
    b.appendParagraph('【気づき】').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    b.appendParagraph(body.notes);
  }
  if (body.audioTranscript) {
    b.appendParagraph('【録音文字おこし】').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    b.appendParagraph(body.audioTranscript);
  }
  if (body.photoUrls && body.photoUrls.length) {
    b.appendParagraph('【しゃしん】').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.photoUrls.forEach(function (url) { b.appendParagraph(url); });
  }
  if (body.drawingUrls && body.drawingUrls.length) {
    b.appendParagraph('【おえかき】').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.drawingUrls.forEach(function (url) { b.appendParagraph(url); });
  }
  if (body.audioUrl) {
    b.appendParagraph('【録音ファイル】').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    b.appendParagraph(body.audioUrl);
  }
  doc.saveAndClose();
  return jsonOut({ ok: true, docUrl: doc.getUrl() });
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

// -------------------------------------------------------------------
// 記録ノート → Google Docs(同じ Apps Script を 再利用、kind='field-note')
// -------------------------------------------------------------------

export type FieldNoteDocPayload = {
  timestamp: string;
  student: { nickname: string | null; handle: string | null };
  className: string | null;
  unitTitle: string | null;
  title: string;
  notes: string;
  locationNote: string | null;
  audioTranscript: string | null;
  audioUrl: string | null;
  photoUrls: string[];
  drawingUrls: string[];
};

export type FieldNoteDocResult =
  | { ok: true; docUrl: string }
  | { ok: false; reason: string };

/**
 * 記録ノートを Google Docs に エクスポート。
 * クラスの Apps Script Web App に POST し、作成された Doc の URL を 返す。
 */
export async function postFieldNoteToClassDoc(
  classId: string,
  payload: FieldNoteDocPayload,
): Promise<FieldNoteDocResult> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { sheetsWebhookUrl: true, sheetsWebhookSecret: true, name: true },
  });
  if (!cls?.sheetsWebhookUrl || !cls.sheetsWebhookSecret) {
    return { ok: false, reason: '先生が Google 連携を まだ 設定していません' };
  }
  const body = JSON.stringify({
    secret: cls.sheetsWebhookSecret,
    kind: 'field-note',
    ...payload,
    className: payload.className ?? cls.name,
  });
  try {
    const res = await fetch(cls.sheetsWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return { ok: false, reason: `webhook HTTP ${res.status}` };
    }
    const data = (await res.json()) as { ok?: boolean; docUrl?: string; error?: string };
    if (!data.ok || !data.docUrl) {
      return { ok: false, reason: data.error ?? 'Docs の 作成に 失敗しました' };
    }
    return { ok: true, docUrl: data.docUrl };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
