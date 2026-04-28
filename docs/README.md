# 📘 しらべてつくろう!AIラボ 設計ドキュメント

> **⚠️ 本実装は 簡素化版。これらの 設計ドキュメントは 歴史的経緯。**
> 教員 UI / 研究機能(Stance / Survey / Reflection / MissingVoice / Episode 等)は
> 現バージョンでは すべて 撤去済み。児童向け 創作・対話アプリのみ を 残している。
> 認証システムも なし(出席番号 Cookie のみ)。
>
> 現在の 実装と 一致しているのは 主に [07-auth.md](07-auth.md)(書き直し済み)と
> [12-research-methods.md](12-research-methods.md)(撤廃の 注記)。
> 他の 番号付きドキュメントは 設計初期の 検討記録として 残している。

Phase 0 の設計成果物です。

本アプリは 当初「**AIに出てこないのは誰か**」を問い続ける、小学校社会科を主軸にした探究学習プラットフォームとして 設計したが、
現バージョンでは「子どもが 主体的に 楽しんで 学ぶ ための 創作・対話アプリ」に 絞り込んでいる。

---

## 🗂️ 目次

### 全体像・設計思想
| # | ドキュメント | 概要 |
|---|----|------|
| 00 | [プロジェクト概要](00-overview.md) | ビジョン・ターゲット・非目標・プロダクト原則 |
| 01 | [アーキテクチャと技術スタック](01-architecture.md) | Next.js / Prisma / Auth.js 構成、ディレクトリ |
| 02 | [データモデル](02-data-model.md) | Prisma schema(確定版)、ER 図、Unit / Stance / Reflection / Survey / Episode / CoOccurrence |
| 03 | [画面遷移図](03-screens.md) | 児童・教員・単元フロー、主要 22 画面のワイヤーと挙動 |

### Claude API プロンプト設計
| # | ドキュメント | 使用モデル |
|---|-----|-----|
| 04 | [プロンプト目次](04-prompts/README.md) | — |
| 04-1 | [ボット本体ランタイム](04-prompts/bot-runtime.md) | Sonnet 4.6 |
| 04-2 | [入力モデレーション](04-prompts/moderation-input.md) | Haiku 4.5 |
| 04-3 | [出力モデレーション](04-prompts/moderation-output.md) | Haiku 4.5 |
| 04-4 | [つくってみようモード コード生成](04-prompts/mini-app-codegen.md) | Sonnet 4.6 |
| 04-5 | [画像プロンプトコーチ](04-prompts/image-prompt-coach.md) | Sonnet 4.6 |
| 04-6 | [画像プロンプト安全化](04-prompts/image-prompt-safety.md) | Haiku 4.5 |
| 04-7 | [インフォグラフィック生成](04-prompts/infographic-gen.md) | Sonnet 4.6 |
| 04-8 | [「AIに出てこないのは誰?」プローブ](04-prompts/missing-voice-probe.md) | Sonnet 4.6 |
| 04-9 | [立ち止まりの言葉検出](04-prompts/standstill-detection.md) | Haiku 4.5 |
| 04-10 | [エピソード記述抽出](04-prompts/episode-extractor.md) | Sonnet 4.6 |
| 04-11 | [共起分析要約](04-prompts/co-occurrence-summary.md) | Sonnet 4.6 |
| 04-12 | [事前事後アンケート生成](04-prompts/pre-post-survey-gen.md) | Sonnet 4.6 |
| 04-13 | [単元骨子提案](04-prompts/unit-scaffold.md) | Sonnet 4.6 |

### 安全性・UX・認証
| # | ドキュメント | 概要 |
|---|----|------|
| 05 | [安全性とプライバシー](05-safety-and-privacy.md) | 多層モデレーション、サンドボックス、個人情報、**研究倫理** |
| 06 | [学年プロファイル](06-grade-profiles.md) | lower/middle/upper の UX 差分、ふりがな |
| 07 | [認証設計](07-auth.md) | 絵柄パスワード、マジックリンク、**保護者ログインなし** |

### 実装・運用
| # | ドキュメント | 概要 |
|---|----|------|
| 08 | [API 抽象化レイヤ](08-api-abstractions.md) | LLM / Image / Video / Music / CoOccurrence / Storage Adapter |
| 09 | [リスク一覧と対策](09-risks.md) | 27 件のリスク(含む研究倫理)と予防・検知・回復 |
| 10 | [フェーズ計画](10-phases.md) | Phase 0〜5 のマイルストーン |

### 教育・研究の設計原理
| # | ドキュメント | 概要 |
|---|----|------|
| 11 | [教科等横断](11-cross-curricular.md) | 社会を主軸に、国語・図工・音楽・総合・プログラミングを接続 |
| 12 | [研究方法論の実装](12-research-methods.md) | 実習Ⅱ・Ⅲの授業原理を機能に落とし込む、Wilcoxon・共起・エピソード |

---

## 🧭 読み進める順番(推奨)

**はじめての方:**
1. [00-overview.md](00-overview.md) — 何を作るか、なぜか
2. [11-cross-curricular.md](11-cross-curricular.md) — 教科をどうつなぐか
3. [03-screens.md](03-screens.md) — どんな UX か
4. [10-phases.md](10-phases.md) — どう作っていくか

**設計レビュワー:**
1. [00-overview.md](00-overview.md)
2. [12-research-methods.md](12-research-methods.md) — 本アプリ固有の研究原理
3. [05-safety-and-privacy.md](05-safety-and-privacy.md) — 最重要
4. [01-architecture.md](01-architecture.md) / [02-data-model.md](02-data-model.md)
5. [04-prompts/README.md](04-prompts/README.md) → 各プロンプト(特に missing-voice-probe)
6. [09-risks.md](09-risks.md)

**実装担当者:**
1. [01-architecture.md](01-architecture.md)
2. [02-data-model.md](02-data-model.md)
3. [08-api-abstractions.md](08-api-abstractions.md)
4. [07-auth.md](07-auth.md)
5. [04-prompts/](04-prompts/) の担当範囲
6. [10-phases.md](10-phases.md) の該当 Phase

**教員・学校関係者:**
1. [00-overview.md](00-overview.md)
2. [11-cross-curricular.md](11-cross-curricular.md)
3. [05-safety-and-privacy.md](05-safety-and-privacy.md)
4. [06-grade-profiles.md](06-grade-profiles.md)
5. [03-screens.md](03-screens.md) の児童画面と教員画面
6. [09-risks.md](09-risks.md)

**教育研究者(実習Ⅱ・Ⅲ):**
1. [12-research-methods.md](12-research-methods.md) — 中核
2. [04-prompts/missing-voice-probe.md](04-prompts/missing-voice-probe.md)
3. [04-prompts/standstill-detection.md](04-prompts/standstill-detection.md)
4. [04-prompts/episode-extractor.md](04-prompts/episode-extractor.md)
5. [04-prompts/co-occurrence-summary.md](04-prompts/co-occurrence-summary.md)
6. [04-prompts/pre-post-survey-gen.md](04-prompts/pre-post-survey-gen.md)
7. [02-data-model.md](02-data-model.md) の Unit / StanceSnapshot / ReflectionEntry など

---

## ❓ ご意見・ご質問

設計段階での変更は歓迎です。
気になる点は Issue か、口頭での相談をお寄せください。

実装着手は、Phase 0 のご承認をいただいてからとなります。
