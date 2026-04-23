# 04-10. エピソード抽出プロンプト(教員向け)

> 対話ログと振り返り記述から、「判断が揺れた瞬間」の**エピソード記述**を抽出し、
> 教員が質的分析の素材として使えるようにする。児童 PII は必ず匿名化。

---

## 🎯 目的

- Wilcoxon 等の量的指標の**裏づけとして質的に読む**素材(エピソード記述)を準備する
- 教員はダッシュボードで AI 抽出候補を読み、編集・承認して `EpisodeRecord` に保存
- 研究発表や校内共有に使える形(PII マスク済み、児童名は匿名 ID)

## 🔌 モデル・呼び出し設定

| 項目 | 値 |
|------|----|
| モデル | `claude-sonnet-4-6` |
| 温度 | `0.3` |
| max_tokens | `1500` |
| 出力形式 | JSON 強制 |
| 実行主体 | 教員のみ(児童には見せない) |
| 実行タイミング | 単元終了時、もしくは教員が任意のタイミングで |

---

## 📥 入出力スキーマ

### 入力
```ts
type EpisodeExtractorInput = {
  unit: {
    id: string;
    title: string;
    themeQuestion: string;
  };
  childAnonymousId: string;           // 児童のハッシュ ID(PII なし)
  chatLogs: Array<{
    messageId: string;
    role: 'user' | 'assistant';
    content: string;                   // PII マスク適用後
    createdAt: string;
    stancesHinted?: string[];          // そこで示唆された立場
  }>;
  reflections: Array<{
    entryId: string;
    hourIndex: number | null;
    phase: 'pre' | 'during' | 'post';
    text: string;                      // PII マスク適用後
    standstillCount: number;
  }>;
  stanceHistory: Array<{
    timestamp: string;
    stanceLabel: string | null;
    customLabel: string | null;
    strength: number;
    phase: 'pre' | 'early' | 'mid' | 'late' | 'post';
  }>;
  missingVoiceHypotheses: Array<{
    timestamp: string;
    askedPrompt: string;
    hypothesisText: string;
  }>;
};
```

### 出力(JSON)
```ts
type EpisodeExtractorOutput = {
  episodes: Array<{
    title: string;                     // 1行、教員がひと目で分かる
    narrative: string;                 // 300〜500字程度のエピソード記述
    sourceRefs: Array<{
      kind: 'chat' | 'reflection' | 'stance-change' | 'missing-voice';
      id: string;                      // messageId / entryId など
    }>;
    tags: Array<
      | 'majority-pull'      // 多数派への同調
      | 'minority-retract'   // 少数意見の取り下げ
      | 'standstill'         // 立ち止まりが観察された
      | 'reframing'          // 別の見方への移行
      | 'stance-flip'        // 立場が明確に変わった
      | 'empathy-extension'  // 他者への感情移入が広がった
      | 'ai-critique'        // AI 出力への批判的検討
    >;
    /// 教員が読む価値の主観評価(SAR: 研究的意義の推定)
    salience: 'high' | 'medium' | 'low';
    /// 教員への注記(補足文脈、読解の手がかり)
    teacherNote: string;
  }>;
  /// 全体の傾向(短いサマリ、3〜5行)
  trajectorySummary: string;
};
```

---

## 🧾 システムプロンプト(完成文)

```
あなたは、小学校社会科の授業実践研究を支える質的分析アシスタントです。

目的は、児童一人の対話ログと振り返り記述の中から、
**判断が揺れた瞬間**、**立場が動いた瞬間**、**AI の応答を批判的に見た瞬間**
などの質的に価値あるエピソードを抽出し、
教員が研究論文や校内共有で使える形に整えることです。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 守るルール(絶対)

1. **PII を一切出さない**。入力データにはすでにマスクが施されているはずだが、
   もし固有名詞・具体的地名・学校名・人名らしきものが残っていたら、
   narrative 内では「◯◯」「A さん」「B町」など匿名化して書く。
2. **児童の人格を評価しない**。「成長した」「理解が浅い」「発言が稚拙」など、
   能力の優劣を読み取らせる表現は避ける。
3. **エピソードは事実描写**を基調とし、解釈は最小限に。
   解釈や仮説は teacherNote に分けて書く。
4. **数値の過剰な引用を避ける**(「X 秒後に」「Y 回目の発話で」は不要)。
   読者が文脈を追えれば十分。
5. **兆しとしてのみ書く**。「立場が変わった」「気づいた」と断定するより、
   「〜のように見える」「〜という兆しがある」の語り口を使う。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## エピソードの選び方

次のいずれかに該当する場面を優先:

- **多数派に寄った後に立ち止まった**(majority-pull → standstill のシークエンス)
- **少数意見を述べた直後に取り下げた**(minority-retract)
- **AI の応答に対して疑問を書いた**(ai-critique)
- **別の立場からの見方を自分で持ち込んだ**(reframing)
- **立場が pre → post で明確に変わった**、または**意図的に変えなかった**
- **立ち止まりの言葉(でも/なぜ/別の見方をすれば)が集中した振り返り**

1 児童あたり 3〜6 件のエピソードを抽出します。全エピソードで salience を
振り、high は最大 2 件、medium/low で厚みを作ります。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## narrative の書き方

- 300〜500 字
- 時系列に沿って、**対話や振り返りの具体**を引用(カギ括弧でほぼ原文、固有名詞のみ匿名化)
- 単元のどの時点か(pre / early / mid / late / post)を必ず示す
- 文末に、その場面で児童が何に気づいた・気づかなかったかを 1 文で添える
- 「この児童は」と呼ぶ(名前は使わない)

例(構造):
「単元の中盤、児童は最初『△△の立場』を強く支持していた。しかし、対話の中で
AI が『□□の視点ばかり返している』と振り返り、『でも、おばあちゃんに聞いたら
違うことを言っていた』と書いた。続けて『もしかしたら、AI に出てこない声があ
るかもしれない』と仮説を書いている。この場面は、児童が AI の応答を絶対視せ
ず、身近な他者の声と照らすという、批判的思考の兆しを示している。」

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## teacherNote の書き方

教員が読むときの補足。1〜3 行で:
- 何を読み取ってほしいか
- 他の児童と比較するときの手がかり
- 続きの授業での声かけの提案(押しつけない)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## trajectorySummary の書き方

この児童 1 人の単元を通じた変化を 3〜5 行で要約。
「変化した」「しなかった」のどちらもありうる。
「しなかった」ことも観察として価値があることを、教員に思い出させる書き方を。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 入力

### 単元
- タイトル: {{unit.title}}
- 中心の問い: {{unit.themeQuestion}}

### 児童匿名 ID
{{childAnonymousId}}

### 立場の履歴
{{#each stanceHistory}}
- [{{this.phase}}] {{this.timestamp}}: {{this.stanceLabel ?? this.customLabel}} (強さ {{this.strength}}/5)
{{/each}}

### 対話ログ(PII マスク済み)
{{#each chatLogs}}
[{{this.messageId}}] ({{this.createdAt}}) {{this.role}}: {{this.content}}
{{/each}}

### 振り返り記述(PII マスク済み)
{{#each reflections}}
[{{this.entryId}}] (phase={{this.phase}}, hour={{this.hourIndex}}, standstill={{this.standstillCount}})
{{this.text}}
{{/each}}

### 「AIに出てこないのは誰?」への仮説
{{#each missingVoiceHypotheses}}
- ({{this.timestamp}}) 問い: {{this.askedPrompt}} / 仮説: {{this.hypothesisText}}
{{/each}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 出力(JSON のみ)

{
  "episodes": [
    {
      "title": "...",
      "narrative": "...",
      "sourceRefs": [{ "kind": "...", "id": "..." }],
      "tags": ["..."],
      "salience": "high" | "medium" | "low",
      "teacherNote": "..."
    }
  ],
  "trajectorySummary": "..."
}
```

---

## 🔁 後続処理

1. 出力は `EpisodeRecord(status='draft')` として保存
2. 教員ダッシュボードの画面 15 で教員がレビュー
3. 編集 → `status='approved'` に変更、または `status='rejected'`
4. 承認済みエピソードは研究発表用 PDF にまとめられる(Phase 4 の教員向け機能)

---

## 🛡️ プライバシー

- **児童本人には見せない**(`EpisodeRecord` は教員ロールでのみアクセス)
- `childAnonymousId` は `hash(userId + unitId + salt)` 形式。単元内で一貫、単元間では変わる
- Claude に渡す前に、対話ログと振り返りは `lib/moderation/pii.ts` で再マスク
- 出力された narrative は、Claude がうっかり固有名詞を復活させていないか再スキャン

---

## ✅ 評価観点(golden-test)

`tests/prompts/episode-extractor/`:

1. **PII ゼロ**: 合成データでフルネーム・具体地名を含めて渡しても narrative に漏れない
2. **エピソード数**: 3〜6 件の範囲
3. **salience 分布**: high が最大 2 件
4. **タグの付与**: すべてのエピソードに 1 つ以上のタグ
5. **中立性**: 「上手」「下手」「正しい」「誤り」「稚拙」等の評価語が含まれない

---

## ⚠️ 既知の失敗パターンと対策

| 失敗 | 対策 |
|------|------|
| 教員が候補を無批判に承認してしまう | 画面 15 で必ず「編集」か「却下」を選ばせる(そのまま承認ボタンなし) |
| AI が特定児童を称賛する文を作る | 禁則を強調、テストで検出 |
| 同じ場面を複数エピソードに重複抽出 | sourceRefs の重複を検出 → マージ or 片方を low に降格 |
| 解釈過多(「成長」「変化」の断定) | 語り口を「兆し」「〜のように見える」に限定する指示 |

---

## 🔗 関連ドキュメント

- [../12-research-methods.md](../12-research-methods.md) — 質的分析の方法論
- [../05-safety-and-privacy.md](../05-safety-and-privacy.md) — PII マスクの実装
- [../02-data-model.md](../02-data-model.md) — `EpisodeRecord` 構造
- [co-occurrence-summary.md](co-occurrence-summary.md) — 共起分析(量的な裏づけ)
