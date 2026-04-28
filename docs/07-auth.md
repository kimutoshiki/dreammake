# 07. 認証設計(現アーキテクチャ:認証なし、出席番号 Cookie)

> **本実装では 認証システムは 持たない。**
> 1 人 1 台の iPad を 前提に、最初の 訪問で 出席番号(1〜40)を 1 回だけ
> 選び、Cookie(30 日)で 固定する。

---

## 設計方針

1. **認証フローを 持たない**
   - パスワード / マジックリンク / OAuth は 一切 なし
   - 児童は アプリを 開いて 出席番号を タップするだけ
2. **セキュリティ境界は「教室の iPad」**
   - 1 児童 = 1 iPad、共有しない 前提
   - 端末の 物理的 管理(教員と 学校)が 唯一の 防衛線
3. **保護者・教員の ログインも なし**
   - 教員 UI は 撤去済み(児童向けのみ)
   - 保護者向け 公開ポータルも なし
4. **Cookie**
   - 名前: `stk_kid_id`
   - 値: 児童 User ID(`s-NN` ではなく cuid)
   - `httpOnly: true` / `sameSite: 'lax'` / `path: '/'` / `maxAge: 30 日`

---

## 番号の 切り替え

- 切り替え UI は **意図的に 用意しない**(共有を 招くため)
- 番号を 間違えた場合は `/privacy` の「🔁 iPad の ばんごうを かえる」から
  Cookie を 消して 番号選択画面 (`/pick`) に 戻れる

---

## 関連ファイル

- `lib/context/kid.ts` — `getCurrentKid()`, Cookie set/clear
- `lib/context/actions.ts` — `resetKidAndGoPick()` Server Action
- `app/pick/page.tsx` — 出席番号 1〜40 の グリッド
- `app/page.tsx` — Cookie あり → `/kids`、なし → `/pick`
- `app/kids/layout.tsx` — Cookie 無効なら `/pick` リダイレクト

---

## 旧設計(撤廃)

旧版で 検討していた「学校コード + 児童 ID + 絵柄パスワード」は
**実装されないまま 撤廃**。git 履歴を 参照。
