import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/Card';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Card>
        <CardTitle>このアプリについて(AI 利用と プライバシー)</CardTitle>
        <p className="mt-2 text-xs text-kid-ink/60">
          最終更新:このコミットと同日(詳細は git log を参照)
        </p>

        <section className="mt-6 space-y-4 text-sm leading-relaxed">
          <div>
            <h2 className="font-semibold text-kid-primary">
              🤖 AI を使っていることの明示
            </h2>
            <p className="mt-1">
              本アプリは、ボットとの対話と「声が聞こえていないのはだれ?」機能で、
              <strong>Anthropic の Claude API</strong>(Claude Sonnet / Haiku)を
              使って応答を生成しています。AI は間違えることがあります。
              大事なことは本・先生・おうちの人にも確かめてください。
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-kid-primary">🛡️ 子どもの安全のための 取り組み</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                児童に本名や住所、電話番号、学校名を書かせない設計
                (モデレーションで検知した場合は、本人には そのまま返さず、
                先生に 気づきが届くようになっています)
              </li>
              <li>
                すべての児童入力と AI 応答に、多層のモデレーション
                (ルール検査 + Claude Haiku)を適用
              </li>
              <li>
                Anthropic 提供の child-safety system prompt を、
                すべての AI 呼び出しの最初に固定で差し込む設計
                (組織が導入時に公式本文を反映)
              </li>
              <li>
                1 日あたりの AI 呼び出し上限を、ユーザーごとにサーバー側で強制
              </li>
              <li>
                本アプリは、組織(学校・自治体)が
                Anthropic の利用規約の「未成年者の安全策」
                を満たす前提で導入されます。
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-kid-primary">
              🔐 集めていない / 集めている データ
            </h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <strong>集めていない</strong>:児童本名・住所・電話番号・メール・顔写真
              </li>
              <li>
                <strong>集めている</strong>:ニックネーム、ボット、ナレッジと出典、
                対話ログ、ふりかえり、立場の記録、事前事後アンケート回答
              </li>
              <li>
                研究モードの 単元では、匿名 ID(単元内で一貫、単元間では 変わる
                ハッシュ)で 児童を 識別します。
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-kid-primary">
              📜 保護者の同意
            </h2>
            <p className="mt-1">
              13 歳未満の利用は、保護者同意を教員経由で記録し、
              同意が揃ってから学習を始めます。保護者は、いつでも 同意を撤回できます。
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-kid-primary">
              📚 関連ドキュメント(運用者向け)
            </h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Anthropic 未成年向け利用ガイドライン:{' '}
                <a
                  href="https://support.claude.com/en/articles/9307344"
                  className="text-kid-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  support.claude.com/.../9307344
                </a>
              </li>
              <li>
                Anthropic API キー ベストプラクティス:{' '}
                <a
                  href="https://support.claude.com/en/articles/9767949"
                  className="text-kid-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  support.claude.com/.../9767949
                </a>
              </li>
              <li>
                Anthropic 利用規約:{' '}
                <a
                  href="https://www.anthropic.com/legal/aup"
                  className="text-kid-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  anthropic.com/legal/aup
                </a>
              </li>
            </ul>
          </div>
        </section>

        <div className="mt-8">
          <Link
            href="/"
            className="rounded-full bg-kid-soft px-4 py-2 text-sm hover:bg-kid-primary/20"
          >
            ← トップに戻る
          </Link>
        </div>
      </Card>
    </main>
  );
}
