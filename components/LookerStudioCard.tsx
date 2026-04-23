import { Card, CardTitle } from '@/components/ui/Card';

export function LookerStudioCard({ hasSheets }: { hasSheets: boolean }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="text-2xl">📊</span>
        <CardTitle>Looker Studio で 分析ダッシュボード</CardTitle>
      </div>
      {!hasSheets ? (
        <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          先に「Google スプレッドシート自動連携」を 設定してください。
          Looker Studio は その スプレッドシートを データソースとして 使います。
        </p>
      ) : (
        <p className="mt-2 text-sm text-kid-ink/80">
          すでに 設定済みの Google スプレッドシートを、
          <strong className="text-kid-primary"> Looker Studio </strong>
          に つなぐと、分析ダッシュボード(立ち止まりの言葉の推移、立場の分布、
          児童別の活動量)が 無料で 作れます。
        </p>
      )}

      <details className="mt-4 rounded-2xl bg-kid-soft p-4 text-sm">
        <summary className="cursor-pointer font-semibold">
          📖 導入手順(10 分)
        </summary>
        <ol className="ml-5 mt-3 list-decimal space-y-2">
          <li>
            <a
              href="https://lookerstudio.google.com/"
              target="_blank"
              rel="noreferrer"
              className="text-kid-primary underline"
            >
              Looker Studio(無料)
            </a>
            を 開き、先生の Google アカウントで ログイン
          </li>
          <li>「空のレポート」を 作成 → 「Google スプレッドシート」を 選ぶ</li>
          <li>
            Sheets 連携で 設定した 児童データの シートを 選ぶ
            (列:timestamp / kind / student_nickname / class / unit / title /
            content / extra)
          </li>
          <li>「追加」→ レポートにデータが 取り込まれる</li>
          <li>
            推奨ビジュアル:
            <ul className="ml-5 mt-1 list-disc space-y-1">
              <li>
                <strong>時系列グラフ</strong>(ディメンション:timestamp、指標:
                レコード数、ディメンション分解:kind)で 学習活動の 推移
              </li>
              <li>
                <strong>棒グラフ</strong>(ディメンション:student_nickname、
                指標:レコード数)で 児童別の 参加量
              </li>
              <li>
                <strong>円グラフ</strong>(ディメンション:kind)で
                ふりかえり / 立場 / 声の仮説 / 録音 の 内訳
              </li>
              <li>
                <strong>表</strong>(kind='reflection' で フィルタ、
                extra から standstill_count を パース)で 立ち止まり語の ランキング
              </li>
            </ul>
          </li>
          <li>
            レポートの 共有設定で「リンクを知っている人」に 共有するか、
            保護者説明会で 画面投影に 使う
          </li>
        </ol>

        <p className="mt-3 text-xs text-kid-ink/60">
          💡 Looker Studio は データソース(Sheets)の 権限を 継承します。
          児童個人情報は 入っていない(ニックネームのみ)ため、
          校内研究会での 共有に 使いやすいです。
        </p>
      </details>
    </Card>
  );
}
