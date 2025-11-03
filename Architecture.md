# アーキテクチャ概要

このリポジトリは、日本語 Wikipedia を題材にしたブラウザゲーム「Wikipediaゴルフ」を Next.js (Pages Router) と TypeScript で実装したものです。ランダムに選ばれる開始記事から、最小のクリック数で目的の記事へ到達するプレイ体験を提供します。UI は Tailwind CSS を基盤に、ポイントで MUI コンポーネントや React Modal を併用しています。

## 技術スタック

- Next.js 16 (Pages Router) + React 18 + TypeScript
- スタイリング: Tailwind CSS, PostCSS, @mui/material, Emotion
- モーダル/共有: react-modal, react-share
- ビルド/品質: ESLint (eslint-config-next), autoprefixer

## 実行・ビルドスクリプト

| スクリプト | コマンド | 役割 |
| --- | --- | --- |
| dev | `next dev` | 開発サーバーを起動 |
| build | `next build` | 本番用ビルドを生成 |
| start | `next start` | ビルド済みアプリを起動 |
| lint | `next lint` | ESLint による静的解析 |

## ディレクトリ構成

```text
.
├── components/
│   ├── Hints.tsx
│   └── Share.tsx
├── pages/
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx
│   ├── home/
│   │   └── index.tsx
│   └── iframe/
│       └── index.tsx
├── public/
├── styles/
│   └── globals.css
├── useCase/
│   ├── dailyChallenge.ts
│   └── referer.ts
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── tsconfig.json
└── package.json
```

## 主要モジュールの役割

- `pages/index.tsx`: ゲーム本体。Wikipedia API から開始記事・目標記事を取得し、履歴・打数・ヒントなどの状態を管理。ゴール到達時には `ShareModal` を表示。
- `pages/home/index.tsx`: プロモーション用のランディングページ。ゲーム概要や遊び方を静的に紹介。
- `pages/iframe/index.tsx`: Wikipedia ページを iframe で直接埋め込む検証用 UI。シンプルなクリックカウントと履歴機能を提供。
- `components/Hints.tsx`: ゴール記事の被リンク一覧を表示するヒント用モーダルコンポーネント。
- `components/Share.tsx`: クリア時に表示される共有モーダル。X (旧 Twitter) で結果を共有するボタンを提供。
- `useCase/referer.ts`: Wikipedia API の backlinks エンドポイントを利用して、目標記事へのリンク元数とタイトル一覧を取得するドメインロジック。
- `useCase/dailyChallenge.ts`: 日付から計算したページIDを用いて Wikipedia API からゴール／スタート記事を動的に解決するユーティリティ。
- `styles/globals.css`: Tailwind のレイヤー定義と全体スタイルを集約。
- `tailwind.config.ts`, `postcss.config.js`: Tailwind/PostCSS の設定。Next.js と連携してユーティリティクラスを生成。

## 状態管理とデータフロー

1. ユーザーが「スタート」を押すと、デイリーモードでは `fetchDailyChallenge` で決定したページIDから開始／ゴール記事を読み込み、通常モードでは `getGoal` と `pickStart` がランダム記事を取得。
2. 目標記事の被リンク情報を `countReferer` が取得し、ヒント (リンク元タイトル一覧) として `HintsModal` に渡す。
3. 記事本文は `drawHTML` 相当の `dangerouslySetInnerHTML` で描画し、記事内リンクのクリックをカスタムハンドラでフックして内部遷移と打数更新を実現。
4. ゴールタイトルと一致するとゲームオーバー状態に遷移し、`ShareModal` が結果共有ダイアログを表示。

## スタイルと UI レイヤー

- レイアウトと共通スタイルは Tailwind CSS のユーティリティクラスで構築。
- ローディング表示やアクセント要素に MUI (`CircularProgress` など) を導入。
- モーダルは `react-modal` をベースにしつつ、Tailwind クラスでテーマを統一。
- 共有ボタンは `react-share` の `TwitterShareButton` を活用し、SNS 連携を簡潔に実装。

## 今後の拡張のヒント

- Wikipedia API 呼び出しに失敗した際のリトライ・リカバリ処理の強化。
- 履歴リストと本文ビューをレスポンシブに最適化し、モバイル表示を改善。
- ゲーム結果をサーバーサイドへ送信し、ランキングやスコア集計機能を追加する余地。
