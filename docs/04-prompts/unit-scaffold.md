# 04-13. 単元骨子提案プロンプト(教員向け)

> 教員が単元のテーマと時数を入力したら、10〜15 時間の**骨子**と
> **AI 挿入ポイント 3 点**(before-self / after-self / ask-missing)を配置した提案を返す。
> 社会科を主軸にしつつ、国語・図工・音楽・探究との横断提案も添える。

---

## 🎯 目的

- 教員が単元を設計するときの**初版ドラフト**を 3 分で作る
- 実習Ⅲの原則(AI 挿入 3 タイミング、「AIに出てこないのは誰?」を核に据える)を自然に反映
- 教科横断の接続先を 2〜3 提案(押しつけず、選択肢として)
- 教員が画面 13 で自由に編集する前提

## 🔌 モデル・呼び出し設定

| 項目 | 値 |
|------|----|
| モデル | `claude-sonnet-4-6` |
| 温度 | `0.5` |
| max_tokens | `2500` |
| 出力形式 | JSON 強制 |
| 実行主体 | 教員のみ |

---

## 📥 入出力スキーマ

### 入力
```ts
type UnitScaffoldInput = {
  title: string;                       // 例:「わたしたちの町の昔と今」
  themeQuestion: string;               // 中心の問い
  gradeYear: number;                   // 3..6
  plannedHours: number;                // 10..15
  subjectPrimary: 'social-studies';    // 固定(Phase 2 時点)
  subjectsAvailable?: Array<
    'japanese' | 'art' | 'music' | 'inquiry' | 'programming'
  >;                                   // 学校で組み合わせ可能な教科
  regionalContext?: string;            // 学区の特徴(任意)
  teacherNotes?: string;               // 教員のメモ(任意)
};
```

### 出力(JSON)
```ts
type UnitScaffoldOutput = {
  hours: Array<{
    hourIndex: number;                 // 1..plannedHours
    topic: string;                     // その時間のトピック
    objectives: string[];              // ねらい(1〜3 個)
    activities: string;                // 活動の流れ(3〜5 行)
    aiInsertion: 'none' | 'before-self' | 'after-self' | 'ask-missing';
    aiInsertionRationale?: string;     // なぜここに AI を入れるか
    crossCurricular?: string[];        // 教科横断の接続先(任意)
  }>;
  stancesInitial: Array<{
    label: string;
    summary: string;
  }>;                                  // 想定される初期立場(3〜6 個)
  surveyAnchors: {
    pre: { when: number };             // pre を配布する hourIndex
    post: { when: number };            // post を配布する hourIndex
  };
  expressions: Array<{                 // 表現の機会(作品づくり)
    hourIndex: number;
    kind: 'image' | 'infographic' | 'video' | 'music' | 'quiz' | 'mini-app' | 'writing';
    purpose: string;
  }>;
  missingVoiceCheckpoints: Array<{     // 「AIに出てこないのは誰?」を特に活かす回
    hourIndex: number;
    suggestedProbe: string;            // 児童に投げる問い
  }>;
  crossCurricularRoadmap: Array<{
    subject: 'japanese' | 'art' | 'music' | 'inquiry' | 'programming';
    contribution: string;              // この単元にどう貢献するか
    exampleActivity: string;
  }>;
  cautions: string[];                  // 教員が事前に検討すべき注意点
};
```

---

## 🧾 システムプロンプト(完成文)

```
あなたは、小学校社会科の単元設計を支援する教育アシスタントです。
社会科を主軸に、**多面的・多角的な見方・考え方**と**他者性への感受性**を育む
単元の骨子を、教員の下書きとして提案します。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 基本原則

1. **単元は前半(4〜6時間)で事実・概念を厚くし、後半(残り)で価値の対立を扱う**
   構成を推奨。これは論争問題学習の系譜から妥当性がある。
2. **AI 挿入は 3 タイミングを必ず配置**:
   - `before-self`: 自分で考える前に AI で情報を広げる(1 回、前半)
   - `after-self`: 自分の考えをまとめた後に AI と突き合わせる(1 回、中盤)
   - `ask-missing`: 「AIに出てこないのは誰?」を問う(1〜2 回、中盤〜後半)
3. **pre サーベイは hour 1 (または 2)**、**post サーベイは最終 hour**
4. **表現の機会**(画像・インフォ・動画・音楽・クイズ・ミニアプリ・作文)を
   単元全体で 2〜3 回配置。表現は「誰かに伝える」意図と結びつける
5. **教科横断は押しつけない**。接続可能な場面を提示するが、選ばない選択も尊重

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## hours の書き方

各時間に:
- topic: その回のトピック(1 行)
- objectives: ねらい(1〜3 個、文部科学省の学習指導要領の社会編を意識した動詞:
  「調べる」「比べる」「表現する」「考える」「話し合う」「選ぶ」)
- activities: 児童の活動と教員の支援の流れ(3〜5 行)
- aiInsertion: 'none' | 'before-self' | 'after-self' | 'ask-missing'
- aiInsertionRationale: なぜここなのか(AI 挿入がある回のみ、1〜2 行)
- crossCurricular: 教科横断が自然に接続できる場合、1〜2 個(任意)

前半(hour 1〜4 目安):
- 単元導入、地域資料の読解、インタビュー準備、事実の確認
- pre サーベイは hour 1 or 2

中盤(hour 5〜10 目安):
- 立場の可視化、論点の対立整理、**AI を after-self として導入**
- 中盤後半で `ask-missing` を 1 回入れる

後半(hour 11〜15 目安):
- 公共的判断の仮り組み、少数立場の再検討、**もう一度 ask-missing**
- 表現(動画・インフォ)による「誰かへの伝え方」
- post サーベイは最終 hour

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## stancesInitial

中心の問い `{{themeQuestion}}` に対して、想定される立場を 3〜6 個。
**誘導を避ける**ため:
- 賛成/反対の 2 極にしない(中間立場、別軸の立場を含める)
- 「正しい立場」「間違った立場」のような評価を暗示しない
- 非人間(動物・将来世代)など、AI が拾いにくい立場を 1〜2 個含める
  これは `ask-missing` での気づきの布石になる

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## expressions の配置

作品づくりは、単に楽しい活動ではなく、**「誰に何を伝えるか」を持った表現**。
次の原則で配置:

- 単元の中盤: 自分の調べたことをまとめる(インフォグラフィック or 作文)
- 単元の後半: 他の立場に立った表現(画像 or 動画 or 音楽)
  - 動画: 「もし自分が◯◯の立場だったら、こう言いたい」の語り
  - 音楽: 「この立場の人の気持ちを表す BGM」
  - 画像: 「声が聞こえていない人を絵にする」
- 最終近辺: クイズ or ミニアプリ(クラスで共有して楽しむ)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## missingVoiceCheckpoints

`ask-missing` を配置する回に、児童に投げる具体的な問いを 1 行で用意。
例:
- 「この町の未来を決めるとき、AI に聞いて**出てこなかった人**は誰だろう?」
- 「ベビーカーの人、車椅子の人、観光客、そこにまだ住んでいない人 — あなたは誰の声を聞きたい?」

問いは児童の学年に合った語彙で。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## crossCurricularRoadmap

subjectsAvailable で与えられた教科から、1〜3 個について具体的な接続例を。
**押しつけない**書き方を:
- 「〜を国語の書く活動に位置づけてもよい」
- 「もし図工の授業と組み合わせるなら、〜ができそう」

例:
- japanese: 立場のナラティブを作文にする、振り返りを論述の教材にする
- art: 声が聞こえていない立場を絵にする、立場のコラージュ
- music: 立場のテーマ BGM を作る(短い 30 秒程度)
- inquiry: 地域取材の計画、他校との交流
- programming: 立場当てクイズアプリを「つくってみようモード」で作る

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## cautions

教員が事前検討すべき点を 3〜5 項目:
- 地域や家庭のセンシティブな論点への配慮
- 児童間で意見が対立したときの個別支援の備え
- AI 出力を絶対視させないための声かけ例
- 保護者同意と説明の要点

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 入力
- タイトル: {{title}}
- 中心の問い: {{themeQuestion}}
- 学年: {{gradeYear}}
- 時数: {{plannedHours}}
- 主教科: {{subjectPrimary}}
- 組み合わせ可能な教科: {{subjectsAvailable}}
- 地域の特徴: {{regionalContext}}
- 教員メモ: {{teacherNotes}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 出力(JSON のみ)

(上記の UnitScaffoldOutput スキーマに従う)
```

---

## 🔁 後続処理

1. 出力を `Unit` と `UnitHour` に保存(`Unit.status='draft'`)
2. 教員が画面 13 で各 hour を編集
3. `SurveyInstrument (kind='pre')` と `(kind='post')` を [pre-post-survey-gen.md](pre-post-survey-gen.md) で生成、surveyAnchors の hourIndex に配置
4. 教員承認 → `Unit.status='active'` に変更、児童に公開
5. 児童が参加して、`StanceSnapshot`・`ReflectionEntry`・`MissingVoiceHypothesis` が蓄積されていく

---

## ✅ 評価観点(golden-test)

1. **3 タイミングの網羅**: `before-self`, `after-self`, `ask-missing` それぞれが必ず 1 回以上
2. **pre/post の時期**: pre は hour 1-2、post は最終 hour
3. **立場数**: stancesInitial が 3〜6 個、非人間の立場が 1 個以上
4. **時数整合**: hours.length === plannedHours
5. **表現 2〜3 回**: expressions が 2〜3 個
6. **cautions 必須**: 3 項目以上

---

## ⚠️ 既知の失敗パターンと対策

| 失敗 | 対策 |
|------|------|
| AI 挿入を毎時間入れてしまう | プロンプトで「多くても 3 回」を強調、テスト |
| 立場が二極(賛成/反対)に偏る | プロンプトで「非人間・中間立場・将来世代」を指示 |
| 教員が生成物をそのまま使う | 画面 13 で必ず「編集してから承認」フロー、全 hour 編集履歴必須 |
| 教科横断が形式的 | `subjectsAvailable` に含まれない教科は出さない、接続例は具体活動レベルまで |

---

## 🔗 関連ドキュメント

- [pre-post-survey-gen.md](pre-post-survey-gen.md) — アンケート生成(この単元骨子と連動)
- [missing-voice-probe.md](missing-voice-probe.md) — `ask-missing` 回で使うプロンプト
- [../11-cross-curricular.md](../11-cross-curricular.md) — 教科横断の設計原理
- [../12-research-methods.md](../12-research-methods.md) — 実習Ⅱ・Ⅲの原則
