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
| build-daily-pool | `tsx scripts/build-daily-pool.ts` | 今日のお題の候補プール JSON を生成（不定期） |

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
│   │   ├── Reveal.tsx         # 画面に入ったら下からフェードイン（IntersectionObserver）
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
│   │   ├── HoleInCelebration.tsx  # ゴール時の「ホールイン」演出（PC: グリーン俯瞰, スマホ: 全面芝生の縦レイアウト）
│   │   └── MobileDock.tsx     # モバイル用ボトムドック
│   └── home/
│       ├── HoleBoard.tsx      # TOP の主役: 今日のお題 / ランダム / カスタムをタブで切り替えるコース図
│       └── ArticleField.tsx   # 記事名入力（Wikipedia prefixsearch サジェスト付き）
├── hooks/
│   ├── useArticleSuggestions.ts       # Wikipedia prefixsearch のデバウンス取得
│   └── useCopyToClipboard.ts          # コピー + 一時的な完了表示
├── pages/
│   ├── _app.tsx               # フォント読み込み, 共通 <Head>
│   ├── _document.tsx          # lang=ja, テーマ初期化スクリプト
│   ├── index.tsx              # タイトル / ランディング
│   ├── game/index.tsx         # ゲーム本体
│   ├── 404.tsx
│   ├── mock/goal.tsx          # ゴール演出のプレビュー（アプリからはリンクしない）
│   └── iframe/index.tsx       # iframe 埋め込みの検証用 UI
├── public/
│   └── daily-pool.json        # 良質/秀逸な記事の候補プール（不定期に再生成）
├── scripts/
│   └── build-daily-pool.ts
├── styles/
│   └── globals.css            # デザイントークン, ベース, 記事本文のタイポグラフィ
├── useCase/
│   ├── articleCache.ts          # 記事 HTML / 被リンクのメモリキャッシュ + TOP からの先読み
│   ├── dailyChallenge.ts        # 日付ハッシュによるお題の決定, 記事取得
│   ├── dailyChallengeCache.ts
│   ├── dailyPoolBuilder.ts      # プール生成（スクリプト専用）
│   └── referer.ts
├── utils/time.ts
├── tailwind.config.ts
└── package.json
```

## 主要モジュールの役割

- `pages/game/index.tsx`: ゲーム本体。Wikipedia API から開始記事・目標記事を取得し、履歴・打数・ヒントなどの状態を管理。ゴール到達時は `HoleInCelebration`（ホールイン演出、タップでスキップ可）→ `ShareModal` の順に表示。ブラウザの戻るボタンはプレイ中のみ確認ダイアログでガード。
- `pages/index.tsx`: タイトル画面。ページの主役は `HoleBoard`（ティー → フェアウェイ → カップのコース図）。タブで今日のお題 / ランダム / カスタムを切り替え、カスタムの入力欄もボード上に置く。下に遊び方の3ステップ。
- `components/Share.tsx`: クリア時の結果ダイアログ。X 共有、共有テキスト・ルートのコピー、タイトルへ戻る、同じお題でもう一度。
- `components/game/*`: ゲーム画面をデスクトップ（サイドバー）とモバイル（ボトムドック + シート）の両方で組み立てるための部品。同じコンポーネントを `frame="panel" | "bare"` で使い分ける。
- `useCase/referer.ts`: Wikipedia API の backlinks エンドポイントを利用して、目標記事へのリンク元数とタイトル一覧を取得するドメインロジック。
- `useCase/dailyChallenge.ts`: 今日のお題の決定（`pickDailyChallenge`: プールと日付だけから決まる純関数。日付ハッシュでゴール・スタートを選ぶ）、プールの読み込み、記事本文の取得（`fetchArticle`: ID → タイトルの順に試す。リダイレクトは追従。「ID+1」のような別記事へのフォールバックはしない）。
- `useCase/dailyPoolBuilder.ts`: プール生成ロジック（スクリプト専用、ブラウザには含まれない）。良質な記事・秀逸な記事を 1 件ずつ検査し、被リンク数・発リンク数を記録する。
- `useCase/articleCache.ts`: 記事 HTML と被リンク一覧の Promise ベースのメモリキャッシュ（LRU）。ページ遷移をまたいで生き、同時要求は1リクエストに束ねる。`prefetchHole` が TOP で今日のお題のスタート／ゴール記事と被リンクを先読みし、ゲーム画面は即表示になる。省データモードでは先読みしない。
- `useCase/dailyChallengeCache.ts`: 今日のお題の localStorage ミラー（再訪時にスケルトンを出さないため）。
- `scripts/build-daily-pool.ts`: 上記ビルダーを呼ぶ薄い CLI。必要なときだけ手動（または Actions の手動実行）で走らせる。
- `styles/globals.css`: デザイントークン（CSS 変数）、ベーススタイル、`.article-content` 配下の Wikipedia HTML の整形。

## 状態管理とデータフロー

1. ユーザーが「スタート」を押すと、デイリーモードでは `public/daily-pool.json` から日付ハッシュで決めた開始／ゴール記事を読み込み、通常モードでは `getGoal` と `pickStart` がランダム記事を取得。
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
