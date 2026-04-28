# 12. 研究方法論(現バージョンでは 撤廃)

> **本実装では 研究機能は 撤去済み。**
> 児童が 主体的に 楽しんで 学ぶ ための 創作・対話アプリのみ を 残し、
> 教員向け 分析画面・アンケート・ふりかえり集計・スタンス計測などは
> すべて 削除した。

旧版で 想定していた:

- 事前意識調査 / 事後ふりかえり の Likert スケール
- 単元 / Stance / Survey / Reflection / MissingVoice / Episode / Feedback / Consent の データモデル
- 教員向け 集計 UI(`/teacher/*`)
- Looker Studio へのスナップショット

これらは **削除済み**。git 履歴(`Strip teacher+research surfaces; focus kids hub` ほか)を 参照。

研究目的での データ収集が 必要に なった場合は、本リポジトリを fork し、
旧データモデルを 復元するのが 早い(完全に 別アプリ として 構築する 想定)。
