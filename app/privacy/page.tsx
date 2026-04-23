import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/Card';
import { resetKidAndGoPick } from '@/lib/context/actions';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Card>
        <CardTitle>このアプリについて(AI 利用と プライバシー)</CardTitle>

        <section className="mt-6 space-y-4 text-sm leading-relaxed">
          <div>
            <h2 className="font-semibold text-kid-primary">
              🤖 AI を つかっていることの お知らせ
            </h2>
            <p className="mt-1">
              ボットとの 対話と「AI に 絵を かいてもらう」機能では、
              <strong>Anthropic の Claude API</strong> と{' '}
              <strong>Google の Gemini(Imagen 3)</strong> を つかって 応答を
              生成しています。AI は まちがえることが あります。
              大事なことは 本・先生・おうちの人にも たしかめてね。
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-kid-primary">
              🛡️ こどもの 安全のための とりくみ
            </h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>本名・住所・電話番号・顔写真は 集めません(ニックネームのみ)</li>
              <li>
                児童の 入力と AI 応答に、ルール検査 + Claude Haiku による
                多層モデレーションを 適用
              </li>
              <li>
                Anthropic の child-safety system prompt を、AI 呼び出しの 最初に
                固定で 差し込む 設計(本番は 組織が 公式本文を 反映)
              </li>
              <li>1 日の AI 呼び出し上限を サーバー側で 強制</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-kid-primary">💾 作ったもの の 保管</h2>
            <p className="mt-1">
              しゃしん・どうが・ろくおん・おえかき・おんがく などは、
              先生の PC や 学校のサーバーに 保存されます(外部クラウドに
              自動送信は しません)。
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-kid-primary">
              🌐 オフラインでも つかえる もの
            </h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>📷 しゃしん / 🎥 どうが / 🎙️ ろくおん(文字おこしは Safari の オンデバイス機能)</li>
              <li>🎨 おえかき / 🎵 おんがく / 🧩 クイズを つくる</li>
              <li>📒 記録ノート / 🗓️ わたしの あゆみ / 🗂️ マイさくひん</li>
            </ul>
            <p className="mt-2">
              インターネットが 必要なのは:🤖 ボット対話と 🖼️ AI に 絵を かいてもらう、の 2 つだけです。
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-kid-primary">📚 関連ドキュメント</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Anthropic 未成年向け ガイドライン:{' '}
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

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/kids"
            className="rounded-full bg-kid-soft px-4 py-2 text-sm hover:bg-kid-primary/20"
          >
            ← こどもの ページへ
          </Link>
          <form action={resetKidAndGoPick}>
            <button
              type="submit"
              className="rounded-full border border-kid-ink/10 bg-white px-4 py-2 text-sm text-kid-ink/70 hover:bg-kid-soft"
            >
              🔁 iPad の ばんごうを かえる
            </button>
          </form>
        </div>
        <p className="mt-2 text-xs text-kid-ink/50">
          番号を まちがえて えらんだときだけ 使ってね。Cookie を けして、
          番号えらびの 画面に もどるよ。
        </p>
      </Card>
    </main>
  );
}
