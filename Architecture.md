# アーキテクチャ概要

このリポジトリは、日本語 Wikipedia を題材にしたブラウザゲーム「Wikipediaゴルフ」を Next.js (Pages Router) と TypeScript で実装したものです。ランダムに選ばれる開始記事から、最小のクリック数で目的の記事へ到達するプレイ体験を提供します。UI は Tailwind CSS と自前の軽量 UI コンポーネント群で構築しています。

## 技術スタック

- Next.js 16 (Pages Router) + React 18 + TypeScript
- スタイリング: Tailwind CSS, PostCSS, CSS 変数によるデザイントークン（ライト「Paper」/ダーク「Midnight」）
- フォント: `next/font/google`（Shippori Mincho: 日本語見出し、Fraunces: 数字・ワードマーク）
- 共有: react-share（X への共有ボタン）
- ビルド/品質: ESLint (eslint-config-next), autoprefixer

## 実行・ビルドスクリプト

| スクリプト | コマンド | 役割 |
| --- | --- | --- |
| dev | `next dev -p 3333` | 開発サーバーを起動（このマシンでは 3000/3001 が別サービスに使われているため固定） |
| build | `next build` | 本番用ビルドを生成 |
| start | `next start` | ビルド済みアプリを起動 |
| lint | `eslint .` | ESLint による静的解析 |
| generate-daily | `tsx scripts/generate-daily-challenge.ts` | 今日のお題 JSON を生成 |

## ディレクトリ構成

```text
.
├── components/
│   ├── Brand.tsx              # ロゴマーク / ワードマーク
│   ├── Confetti.tsx           # ゴール時の紙吹雪（Canvas）
│   ├── Share.tsx              # 結果ダイアログ（スコアカード + 共有）
│   ├── ui/                    # 汎用 UI プリミティブ
│   │   ├── Button.tsx         # Button / ButtonLink / IconButton
│   │   ├── Dialog.tsx         # モーダル / ボトムシート（フォーカストラップ, Esc, スクロールロック）
│   │   ├── ConfirmDialog.tsx  # useConfirm(): window.confirm の Promise 版
│   │   ├── Icons.tsx          # インライン SVG アイコン
│   │   ├── Spinner.tsx        # ローディング表示
│   │   └── ThemeToggle.tsx    # テーマ切替 + 初期化スクリプト
│   ├── game/                  # ゲーム画面の部品
│   │   ├── TopBar.tsx         # 固定ヘッダー（Start → Goal, 打数, アクション）
│   │   ├── Scorecard.tsx      # 打数・タイム表示, モードバッジ
│   │   ├── RouteTimeline.tsx  # 辿ったルートのタイムライン + 1手戻す
│   │   ├── GoalCard.tsx       # ゴール記事カード（被リンク数, 閲覧切替）
│   │   ├── DailyCard.tsx      # 今日のお題カード
│   │   ├── HintsPanel.tsx     # ヒント（ゴールのリンク元）一覧 + 絞り込み
│   │   ├── ArticleView.tsx    # 記事本文の表示（マストヘッド, 状態表示）
│   │   └── MobileDock.tsx     # モバイル用ボトムドック
│   └── home/
│       └── CustomChallengeDialog.tsx  # カスタムお題フォーム（サジェスト付き）
├── hooks/
│   ├── useArticleSuggestions.ts       # Wikipedia prefixsearch のデバウンス取得
│   └── useCopyToClipboard.ts          # コピー + 一時的な完了表示
├── pages/
│   ├── _app.tsx               # フォント読み込み, 共通 <Head>
│   ├── _document.tsx          # lang=ja, テーマ初期化スクリプト
│   ├── index.tsx              # タイトル / ランディング
│   ├── game/index.tsx         # ゲーム本体
│   ├── 404.tsx
│   └── iframe/index.tsx       # iframe 埋め込みの検証用 UI
├── public/
│   └── daily-challenge.json   # GitHub Actions が毎日更新
├── scripts/
│   └── generate-daily-challenge.ts
├── styles/
│   └── globals.css            # デザイントークン, ベース, 記事本文のタイポグラフィ
├── useCase/
│   ├── dailyChallenge.ts
│   ├── dailyChallengeCache.ts
│   └── referer.ts
├── utils/time.ts
├── tailwind.config.ts
└── package.json
```

## 主要モジュールの役割

- `pages/game/index.tsx`: ゲーム本体。Wikipedia API から開始記事・目標記事を取得し、履歴・打数・ヒントなどの状態を管理。ゴール到達時には `ShareModal` を表示。ブラウザの戻るボタンはプレイ中のみ確認ダイアログでガード。
- `pages/index.tsx`: タイトル画面。今日のお題チケット、モード切替（タイムアタック / ヒント）、ランダム・カスタムの導線、遊び方を表示。
- `components/Share.tsx`: クリア時の結果ダイアログ。X 共有、共有テキスト・ルートのコピー、タイトルへ戻る、同じお題でもう一度。
- `components/game/*`: ゲーム画面をデスクトップ（サイドバー）とモバイル（ボトムドック + シート）の両方で組み立てるための部品。同じコンポーネントを `frame="panel" | "bare"` で使い分ける。
- `useCase/referer.ts`: Wikipedia API の backlinks エンドポイントを利用して、目標記事へのリンク元数とタイトル一覧を取得するドメインロジック。
- `useCase/dailyChallenge.ts`: 日付から計算したページIDを用いて Wikipedia API からゴール／スタート記事を動的に解決するユーティリティ。
- `styles/globals.css`: デザイントークン（CSS 変数）、ベーススタイル、`.article-content` 配下の Wikipedia HTML の整形。

## 状態管理とデータフロー

1. ユーザーが「スタート」を押すと、デイリーモードでは `fetchDailyChallenge` で決定したページIDから開始／ゴール記事を読み込み、通常モードでは `getGoal` と `pickStart` がランダム記事を取得。
2. 目標記事の被リンク情報を `countReferer` が取得し、ヒント (リンク元タイトル一覧) として `HintsPanel` に渡す。
3. 記事本文は `dangerouslySetInnerHTML` で描画し、記事内リンクのクリックをカスタムハンドラでフックして内部遷移と打数更新を実現。
4. ゴールタイトルと一致するとゲームオーバー状態に遷移し、`ShareModal` が結果共有ダイアログを表示。

## デザインシステム

- **コンセプト**: 「紙の百科事典 × ゴルフのスコアカード」。温かみのある紙色の地に、フェアウェイグリーンのアクセントを1色だけ。
- **トークン**: `styles/globals.css` の `:root` / `:root[data-theme="dark"]` に RGB 値で定義。Tailwind 側は `rgb(var(--x) / <alpha-value>)` で参照（`bg-paper-2`, `text-ink-2`, `border-rule`, `bg-green-soft` など）。
- **記事面**: Wikipedia の inline style は明るい背景を前提としているため、`--page-*` トークンでダークテーマでも記事面だけは「明るい紙」のまま保つ。
- **テーマ**: `localStorage` の `wg-theme`、未設定時は OS 設定に従う。`_document.tsx` のインラインスクリプトで初回描画前に `data-theme` を付与。
- **モーション**: `animate-fade-up` / `animate-scale-in` / `animate-sheet-up` / `animate-pop` を最小限に。`prefers-reduced-motion` で無効化。

## 今後の拡張のヒント

- Wikipedia API 呼び出しに失敗した際のリトライ・リカバリ処理の強化。
- ゲーム結果をサーバーサイドへ送信し、ランキングやスコア集計機能を追加する余地。
