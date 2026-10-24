# cosense-theme-default

公開中の [Cosense](https://scrapbox.io)（旧 Scrapbox）プロジェクトを、そのまま静的サイトにして公開するためのスターターテンプレートです。中身は [cosense-site-kit](https://github.com/shinyaoguri/cosense-site-kit) を使った最小構成の Astro サイト + デフォルトテーマ。

- **書くのは Cosense だけ** — `#publish` を付けたページが、そのままサイトのページになります。Cosense の記法（見出し・装飾・コードブロックのシンタックスハイライト・数式・テーブル・YouTube 埋め込みなど）はそのまま描画されます。
- **ビルドとデプロイは GitHub Actions が自動実行** — ローカル環境ゼロ、ブラウザだけで公開できます。
- **見た目はデフォルトテーマ（npm パッケージ）** — リポジトリにテーマ本体は同梱されず、改善は Dependabot の PR で自動的に取り込まれます。
- **SEO・共有・検索も自動** — 各ページの OpenGraph / Twitter Card / canonical / JSON-LD、`sitemap.xml` / `robots.txt` / `feed.xml`（RSS）、ファビコン、404 ページ、全文検索が設定なしで付きます。

> 非公式のコミュニティ製ツールです。Cosense およびその運営会社とは関係ありません。

このリポジトリ自身がこのテンプレートのライブデモで、Cosense プロジェクト [cosense-theme-default](https://scrapbox.io/cosense-theme-default/) から <https://shinyaoguri.github.io/cosense-theme-default/> に公開されています。

使い方は2通り。**まずは「A. ブラウザだけで公開する」だけで完結します**。見た目を手元で調整したくなったら「B. ローカルで開発する」へ。

---

## 必要なもの

- **公開設定の Cosense（Scrapbox）プロジェクト**（1つ）。URL が `https://scrapbox.io/<プロジェクト名>/` の形で、ブラウザでログインなしに開けること（API が読める必要があります）。
- **GitHub アカウント**。
- （ローカル開発する場合のみ）**Node.js 20 以上** と **Git**。

---

## A. ブラウザだけで公開する（おすすめ・ターミナル不要）

所要 5〜10 分。上から順にやれば公開まで行けます。

### 0. Cosense（Scrapbox）の公開ページの準備
取り込みたいCosenseのプロジェクトを公開状態で準備します

### 1. このテンプレートから自分のリポジトリを作る

1. このページ右上の緑のボタン **「Use this template」→「Create a new repository」** をクリック。
2. **Repository name** を決めます。これがそのまま公開 URL の一部になります（例: `my-notes` → `https://<ユーザー名>.github.io/my-notes/`）。
   - リポジトリ名を **`<ユーザー名>.github.io`** にすると、サブパスなしの `https://<ユーザー名>.github.io/` で公開できます。
3. 公開範囲は **Public** を選びます（GitHub Pages を無料で使うには Public が必要。Private は GitHub Pro / Team が要ります）。

### 2. 自分の Cosense プロジェクトを指定する（コードの編集は不要）

作成したリポジトリで **Settings → Secrets and variables → Actions → Variables タブ → 「New repository variable」** を開き、次を 1 つ登録します。

| Name | Value | 例 |
|---|---|---|
| `COSENSE_PROJECT` | あなたの Cosense プロジェクト名（URL `scrapbox.io/<ここ>/` の部分） | `my-notes` |

これだけです。**未設定のままだとビルドが「`COSENSE_PROJECT` が未設定」というメッセージで止まります**（他人のサイトを黙ってビルドしないための仕様）。以下は自動で決まるので編集しなくて構いません。

- 公開 URL（`site.baseUrl` / `site.base`）— GitHub Pages の設定から自動で入ります。
- サイト名（`site.title`）— 既定はリポジトリ名。変えたいときだけ `cosense.config.ts` の `title` を書き換えます。
- フッターの著作者表示 — リポジトリの所有者（ユーザー名 / Organization 名）が自動で入ります。本名などにしたいときだけ `astro.config.ts` の `copyright` を文字列で上書きします。

### 3. GitHub Pages を有効化する

リポジトリの **Settings → Pages → Build and deployment → Source** を **「GitHub Actions」** に変更します（「Deploy from a branch」ではありません）。

### 4. 最初のビルドを実行する

**Actions** タブ → 左側の **「Build and deploy」** → 右側の **「Run workflow」→「Run workflow」** をクリック。

- 1〜2 分でビルドとデプロイが走ります。緑のチェックが付けば成功です。
- 以降は **15 分ごとに Cosense の更新を確かめ、変わっていれば自動で再ビルド** するので、Cosense を編集すれば放っておいても反映されます。GitHub の定期実行は混雑で遅れることがあり、反映まで数十分〜数時間かかる場合もあります（すぐ反映したいときは再度 Run workflow）。

> はじめて Actions を使うとき「I understand my workflows, go ahead and enable them」の確認が出たら許可してください。

### 5. 公開を確認する

`https://<ユーザー名>.github.io/<リポジトリ名>/` を開きます（Settings → Pages の上部にも公開 URL が表示されます）。

---

## Cosense 側の準備（最低限）

サイトに「どのページを・どう出すか」は Cosense 側で決めます。コードを触らず、タグと `.site` ページ（後述）だけで完結します。

- **公開したいページに `#publish` を付ける** — これが公開スイッチです。付いていないページはサイトに出ません（既定は「全ページ非公開」で、1 ページずつ opt-in する設計）。
- **下書きは `#draft`** — `#publish` が付いていても除外されます。

### ページに付けられるタグ

タグはページ本文のどこに書いても構いません（他のタグと同じ行に並べても OK）。

| タグ | 効果 |
|---|---|
| `#publish` | ページを公開対象に含める（公開スイッチ） |
| `#draft` / `#private` / `#internal` | `#publish` があっても除外する |
| `#post` | `/posts` フィードとホームの「Recent posts」に表示（タグ名は `.site` で変更可） |
| `#slug/my-page` | URL スラッグを明示指定（無指定ならタイトルから生成） |
| `#published/2024-04-01` | 公開日を明示指定（無指定なら Cosense の作成日） |
| `#updated/2026-06-06` | 更新日を明示指定（無指定なら Cosense の更新日） |
| `#no-date` | このページの公開日・更新日を**表示しない**（About など日付不要なページ向け） |
| `#template/profile` | このページを別テンプレートで描画（後述の[テンプレート](#テンプレートページごとの見た目)） |

> **`#publish` と `#published/…` は別物です。** `#publish`（スラッシュ無し）はページを公開する**フラグ**、`#published/YYYY-MM-DD`（`ed` 付き）は**公開日**の指定です。

公開日・更新日の補足:

- 日付フォーマットは厳格な `YYYY-MM-DD`（ゼロ埋め必須）。不正な日付は無視され、警告を出して Cosense のタイムスタンプにフォールバックします（`npm run doctor` で確認できます）。
- `#no-date` を付けても日付データ自体は残るので、一覧の並び順・RSS の `pubDate`・sitemap の `lastmod` には引き続き使われます（消えるのは画面表示だけ）。

- **`.site` ページで構造を宣言**（任意・推奨）— タイトル `.site` のページを作り、`code:site.yaml` ブロックを 1 つ置くと、ナビ・ホーム・記事一覧などを宣言できます:

```
.site

code:site.yaml
 home:
   page: "Home"
 nav:
   - { label: "About",  page: "About" }
   - { label: "GitHub", href: "https://github.com/you" }
 posts:
   tag: "post"
   limit: 10
 featured:
   - "おすすめページ"
 redirects:
   old-slug: new-slug
 theme:
   skin: dark
```

`code:site.yaml` で使える主なフィールド:

| フィールド | 説明 |
|---|---|
| `home.page` | ホーム本文として描画する Cosense ページ。未指定なら「最近のページ一覧」 |
| `nav[]` | ヘッダーのナビ。`{label, page}`（内部リンク）または `{label, href}`（外部 URL） |
| `posts.tag` / `posts.limit` | `/posts` とホームの「Recent posts」に出すタグ名と表示件数 |
| `featured[]` | ホームの注目ページブロック（Cosense ページタイトルの配列） |
| `redirects` | 旧 slug → 新 slug の明示リダイレクト（出したいものだけ書く） |
| `theme.skin` | 配色スキン（後述の[カラーテーマ](#カラーテーマスキン)）。`astro.config.ts` の `preset` より優先 |
| `templates` | ページタイトル → テンプレート名のマッピング（後述の[テンプレート](#テンプレートページごとの見た目)） |

キー名を打ち間違えると（例: `nav` を `navigation` と書く）ビルド時に「did you mean …?」の警告が出るので、`npm run doctor` で気づけます。

`.site` が無くても動きます（`/` に最近のページ一覧が出ます）。全フィールドの詳細は [cosense-site-kit のドキュメント](https://github.com/shinyaoguri/cosense-site-kit) を参照してください。

---

## カラーテーマ（スキン）

デフォルトテーマは配色スキンの切り替えに対応しています。組み込みスキンは次の2つ:

| スキン | 説明 |
|---|---|
| `light` | 既定。明るい配色 |
| `dark` | Notion 風の暖色を保ったダーク配色 |

切り替え方は2通り。**`.site` の指定が最優先**です。

1. **Cosense の `.site` から**（ブラウザだけ・再ビルド不要・**おすすめ**）— `code:site.yaml` に `theme.skin` を足すだけ。運用者がコードを触らず色を変えられます。

   ```
   code:site.yaml
    theme:
      skin: dark
   ```

2. **`astro.config.ts` から**（ビルド時の既定）— `themeDefault({ preset: presetDark })`。独自配色にしたいときは CSS 変数を上書きします:

   ```ts
   import themeDefault, { presetDark } from "@cosense-site-kit/theme-default";
   // ...
   themeDefault({
     preset: presetDark,
     // 独自配色の例（light をベースに CSS 変数を上書き）:
     // preset: { tokens: { "--color-bg": "#191919", "--color-text": "#e6e6e3" }, colorScheme: "dark" },
   })
   ```

`light` / `dark` 以外の名前付きスキンを `.site` から選べるようにするには、テーマ本体の `PRESETS` レジストリに追加します（詳しくは [cosense-site-kit のドキュメント](https://github.com/shinyaoguri/cosense-site-kit)）。

---

## テンプレート（ページごとの見た目）

ページの URL（`/<slug>`）はそのままに、**そのページの描画だけ**を切り替えられます。デフォルトテーマが用意しているテンプレート:

| テンプレート | 用途 |
|---|---|
| `page` | 通常ページ（既定）。タイトル + タグチップ + 本文 + backlinks |
| `profile` | プロフィール系。中央寄せのヒーロー + 本文（タグチップなし） |
| `collection` | YAML データから一覧を組み立てる。職歴・業績・作品集・リンク集など |

指定方法は2通り（タグが優先、無ければ `.site` のマッピング、どちらも無ければ `page`）:

1. **ページ本文にタグ** — `#template/profile` のように付けます。
2. **`.site` の `templates:`** — `code:site.yaml` にページタイトル → テンプレート名で一括指定:

   ```
   code:site.yaml
    templates:
      "About Me": profile
      "Publications": collection
   ```

`collection` はページ本文の最初の `code:foo.yaml` ブロックを「セクション付きの一覧」として描画します。各項目は持っているフィールド（`label` / `period` / `title` / `authors` / `description` / `url` / `tags` など）に応じて整形され、`tags` があればフィルタチップも自動で付きます。CV や論文リストをブラウザだけで作れます。

---

## B. ローカルで開発する（任意）

見た目を確認しながら調整したいときや、公開前に手元でビルドを通したいときに使います。**「A.」で公開できていれば必須ではありません。**

### 必要なもの

- **Node.js 20 以上**（`node -v` で確認）と **Git**。

### 手順

```bash
# 1. 自分のリポジトリを clone（「Use this template」で作ったもの）
git clone https://github.com/<ユーザー名>/<リポジトリ名>.git
cd <リポジトリ名>

# 2. 依存をインストール
npm install

# 3. 自分の Cosense プロジェクト名を環境変数で渡す（この例は macOS / Linux。以降のコマンドも同じシェルで）
export COSENSE_PROJECT=<Cosenseプロジェクト名>

# 4. Cosense からページを取得（.cosense-cache/ に保存される）
npm run fetch

# 5. 開発サーバーを起動
npm run dev
```

開発サーバーは **`http://localhost:4321/`** で開きます。起動時のログにも URL が出ます。

押さえておくポイント:

- `npm run dev` は `.cosense-cache/` に取得済みの内容を表示します。**Cosense を編集して反映したいときは、もう一度 `npm run fetch`** してください（dev は自動では取得し直しません）。
- **全文検索（ヘッダーの🔍）は `npm run dev` では動きません。** 検索インデックスはビルド時に生成するため、下の `npm run build` → `npm run preview` で確認します。

### 本番ビルドを手元で確認する

```bash
npm run build     # cosense-site fetch && astro build（dist/ を生成）
npm run preview   # 本番と同じ出力をローカル配信（検索もここで動く）
```

### 公開前チェック（任意・推奨）

```bash
npm run doctor    # ナビの参照切れ・内部リンク切れ・draft 漏れ・公開0件などを検出
npm run validate  # 設定と取得データの整合を検査
```

### デプロイ

ローカルでの変更（`cosense.config.ts` や `astro.config.ts` など）を **commit して push** すれば、「A.」で有効化した GitHub Actions が自動でビルド & 公開します。手元から直接アップロードする必要はありません。

```bash
git add -A
git commit -m "configure my site"
git push
```

### 依存の自動更新

cosense-site-kit（テーマ・CLI）や Astro の新しいバージョンは、Dependabot が毎日確認して PR を立てます。PR では CI（取得 → `doctor` → ビルド）が走り、**通ったものは自動でマージ**され、1 日 1 回の強制ビルド（日本時間 3 時台）でサイトに反映されます。CI が失敗した PR はマージされずに残るので、内容を確認してください。

自動マージを止めたい場合は `.github/workflows/ci.yml` の `automerge` job を削除してください（PR は引き続き立ちます）。

### PR プレビュー（任意）

PR ごとにサイトをビルドして [Cloudflare Pages](https://pages.cloudflare.com/) へ上げ、`https://pr-<PR番号>.<プロジェクト名>.pages.dev/` の URL を PR にコメントします。push するたびに同じ URL が更新されます。本番の GitHub Pages には影響しません（プレビューには Cloudflare が `noindex` を付けるので検索にも載りません）。

PR を閉じる（マージを含む）と、そのプレビューは自動で削除され、URL は開けなくなります（`preview-cleanup.yml`）。この仕組みより前に閉じた PR のプレビューが残っているときは、**Actions →「PR preview cleanup」→「Run workflow」** に PR 番号を入れて消せます。

初回だけ次を設定します。未設定のあいだは何もしません（CI のビルドだけが走ります）。

1. [Cloudflare](https://dash.cloudflare.com/sign-up) のアカウントを作る（無料プランで足ります）
2. 右上の人型アイコン → **Profile → API Tokens → Create Token → Custom token** で、次の内容のトークンを発行する
   - Permissions: `Account` / `Cloudflare Pages` / `Edit`
   - Account Resources: `Include` / 自分のアカウント
3. **Workers & Pages** を開き、**Account Details** の **Account ID** をコピーする（どの画面でも Cmd/Ctrl + K →「Copy account ID」で取れます）
4. GitHub の **Settings → Secrets and variables → Actions** に登録する
   - Secrets: `CLOUDFLARE_API_TOKEN`（2 のトークン）、`CLOUDFLARE_ACCOUNT_ID`（3 の ID）
   - Variables: `CLOUDFLARE_PAGES_PROJECT`（Pages のプロジェクト名。英小文字・数字・ハイフンで、URL の一部になります。例: `handa-project-preview`）

Pages のプロジェクトは、最初のプレビューのときにワークフローが自動で作ります。プロジェクト名が Cloudflare 全体で既に使われていると、ワークフローがエラーで止まります。その場合は Cloudflare 側にできたプロジェクトを削除し、`CLOUDFLARE_PAGES_PROJECT` を別の名前にしてください。

仕組み: `ci.yml`（PR のコードを権限なしで実行）がビルドして成果物を置き、`preview.yml`（main 側の定義で実行。PR のコードは実行しない）がその静的ファイルだけを Cloudflare に上げます。fork からの PR は、メンテナが Actions の実行を承認してからプレビューされます。

---

## 設定ファイル早見表

| ファイル | 役割 |
|---|---|
| `cosense.config.ts` | データソース（Cosense プロジェクトは環境変数 `COSENSE_PROJECT` から）、公開ルール（`#publish` 等のタグ）、slug 戦略、公開先。 |
| `astro.config.ts` | テーマのオプション（`themeDefault({ nav, copyright, preset, search, ... })`）や他の Astro インテグレーションの追加。 |
| `.github/workflows/build.yml` | 取得 → ビルド → GitHub Pages デプロイの自動化。15 分ごとに Cosense の更新を確かめ、変わったときだけビルドする（1 日 1 回は必ずビルド）。15 分枠の cron は `cosense.config.ts` の `deploy.schedule` と揃えています。`COSENSE_PROJECT` 変数をここで渡しています。 |
| `.github/workflows/ci.yml` / `.github/dependabot.yml` | PR ごとの検証と、依存更新 PR（Dependabot）の自動マージ。 |
| Cosense の `.site` ページ | ナビ / ホーム / 記事一覧などのサイト構造（ブラウザだけで変更可）。 |

テーマのオプション、`.site` の全フィールド、ページごとの見た目を変えるテンプレート機能などの詳細は **[cosense-site-kit のドキュメント](https://github.com/shinyaoguri/cosense-site-kit)** にまとまっています。

---

## うまくいかないとき

- **サイトが空 / ページが出ない** — 公開したいページに `#publish` が付いていますか？ リポジトリ変数 `COSENSE_PROJECT`（ローカルでは環境変数）がプロジェクト名と一致していますか（`https://scrapbox.io/<その名前>/` が開けるか確認）。`npm run doctor` で診断できます。
- **ビルドが「COSENSE_PROJECT が未設定」で止まる** — 上の「A. の 2.」のリポジトリ変数を登録してください。
- **ビルドは成功するのにページが 404** — GitHub Pages の公開元が「GitHub Actions」になっているか（A. の 3.）、Pages の URL とアクセスしている URL が一致しているかを確認してください。
- **CSS が当たらない / リンクが壊れる** — これも公開 URL のズレが原因のことが多いです（`npm run dev` / `npm run build` をローカルで動かしたときは `/` 直下を前提にしています）。
- **検索が出ない（ローカル）** — 仕様です。`npm run build` → `npm run preview` で確認してください。
- **ナビ / posts が出ない** — `.site` の `code:site.yaml` のキー名やインデントを確認。打ち間違い（`nav` → `navigation`）やインデントずれはビルド時に警告が出るので、`npm run doctor` でログを確認してください。
- **Actions が失敗（赤）** — Actions のログを開き `cosense-site fetch` の行を確認。`404` ならプロジェクト名か Cosense の公開設定の問題です。

---

仕組みの詳細・テーマの作り込み・他テーマへの差し替えは [cosense-site-kit](https://github.com/shinyaoguri/cosense-site-kit) を参照してください。
