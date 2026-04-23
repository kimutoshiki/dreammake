'use client';

import { useState, useTransition } from 'react';
import { updateClassSheetsConfig, testSheetsConnection } from '@/lib/actions/class';
import { APPS_SCRIPT_TEMPLATE } from '@/lib/integrations/sheets';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';

export function SheetsConfigClient({
  classId,
  initialUrl,
  initialSecret,
}: {
  classId: string;
  initialUrl: string;
  initialSecret: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [secret, setSecret] = useState(initialSecret);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateClassSheetsConfig(fd);
      if (res.ok) setMsg({ kind: 'ok', text: '保存しました' });
      else setMsg({ kind: 'err', text: res.message });
    });
  }

  function runTest() {
    setMsg(null);
    startTransition(async () => {
      const res = await testSheetsConnection(classId);
      if (res.ok) setMsg({ kind: 'ok', text: res.message! });
      else setMsg({ kind: 'err', text: res.message });
    });
  }

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="text-2xl">📊</span>
        <CardTitle>Google スプレッドシート自動連携</CardTitle>
      </div>
      <p className="mt-2 text-sm text-kid-ink/80">
        クラスごとに 1 枚の Google スプレッドシートを 用意しておくと、
        児童の <strong>録音文字おこし</strong>・<strong>ふりかえり</strong>・
        <strong>「声が聞こえていないのはだれ?」の仮説</strong>・
        <strong>立場の記録</strong> が、保存と同時に 自動で 追記されます。
      </p>

      <details className="mt-4 rounded-2xl bg-kid-soft p-4 text-sm">
        <summary className="cursor-pointer font-semibold">
          📖 セットアップ手順(はじめて のとき、1 回だけ)
        </summary>
        <ol className="ml-5 mt-3 list-decimal space-y-2">
          <li>
            <a
              href="https://docs.google.com/spreadsheets/u/0/create"
              target="_blank"
              rel="noreferrer"
              className="text-kid-primary underline"
            >
              新しい Google スプレッドシート
            </a>
            を 作成(クラス名を 付けて 保存)
          </li>
          <li>
            そのシートで{' '}
            <strong>「拡張機能 → Apps Script」</strong> を 開く
          </li>
          <li>
            表示された コードエディタの 中身を 全部消し、下の スクリプトを
            貼り付ける
          </li>
          <li>
            スクリプト 1 行目の{' '}
            <code className="rounded bg-white px-1">SECRET</code> を、
            下の「シークレット」欄に 入れる 文字と 同じに 書き換える
          </li>
          <li>
            <strong>「デプロイ → 新しいデプロイ → 種類: ウェブアプリ」</strong>
          </li>
          <li>
            「次のユーザーとして 実行: 自分」「アクセスできるユーザー: 全員」
            を 選んで デプロイ
          </li>
          <li>
            表示された <strong>ウェブアプリ URL</strong> を コピー → 下の
            「Webhook URL」に 貼り付ける
          </li>
          <li>
            最後に「テスト送信」を 押して、スプレッドシートに 1 行 追加されれば 成功!
          </li>
        </ol>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowScript((v) => !v)}
            >
              {showScript ? 'スクリプトを隠す' : 'スクリプトを表示'}
            </Button>
            <Button type="button" variant="ghost" onClick={copyScript}>
              {copied ? '✅ コピーしました' : '📋 スクリプトをコピー'}
            </Button>
          </div>
          {showScript && (
            <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-white p-3 text-xs leading-relaxed ring-1 ring-kid-ink/10">
              <code>{APPS_SCRIPT_TEMPLATE}</code>
            </pre>
          )}
        </div>
      </details>

      <form onSubmit={save} className="mt-6 space-y-4">
        <input type="hidden" name="classId" value={classId} />
        <div>
          <Label>Webhook URL(Apps Script の デプロイ URL)</Label>
          <Input
            name="webhookUrl"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
          />
        </div>
        <div>
          <Label>シークレット(スクリプトの SECRET と 同じ文字)</Label>
          <Input
            name="webhookSecret"
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="強めの英数字(例:openssl rand -hex 16)"
          />
          <p className="mt-1 text-xs text-kid-ink/60">
            他の人に 推測されない 文字列にしてください(空欄にすると 連携が 無効)
          </p>
        </div>

        {msg && (
          <p
            className={`rounded-xl p-3 text-sm ${
              msg.kind === 'ok'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {msg.text}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? '保存中…' : '💾 保存'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending || !url || !secret}
            onClick={runTest}
          >
            📡 テスト送信
          </Button>
        </div>
      </form>

      <div className="mt-6 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
        💡 この Webhook は <strong>OAuth 不要</strong>。スプレッドシートは
        先生の Google アカウントに ひも付き、児童の端末から 認証情報を 送る
        必要は ありません。テスト送信で 動作を 確認してから 児童に
        使わせてください。
      </div>
    </Card>
  );
}
