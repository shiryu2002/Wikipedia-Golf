# Daily Challenge Generation Script

このディレクトリには、Wikipedia Golfの「今日のお題」を自動生成するスクリプトが含まれています。

## 概要

`generate-daily-challenge.ts`は、以下の機能を提供します：

1. 日付ベースのID計算により、デイリーチャレンジのゴールとスタート記事を決定
2. Wikipedia APIを使用して、有効な記事のみを選択（カテゴリ、ユーザーページ、ノートページなどを除外）
3. 生成結果を`public/daily-challenge.json`に保存

## 使用方法

### ローカルでの実行

```bash
npm run generate-daily
```

または、出力先を指定する場合：

```bash
npx tsx scripts/generate-daily-challenge.ts path/to/output.json
```

## フィルタリングロジック

スクリプトは、以下の条件を満たす記事のみを選択します：

- **名前空間**: メイン記事名前空間（namespace 0）のみを選択
  - カテゴリ（Category:）、ノート（Talk:）、ユーザーページ（User:）などを除外
- **存在確認**: `missing`や`invalid`フラグがない記事のみを選択

## GitHub Actionsとの連携

`.github/workflows/update-daily-challenge.yml`により、以下のスケジュールで自動実行されます：

- **スケジュール**: 毎日0時（JST）= 15:00 UTC
- **処理内容**:
  1. リポジトリをチェックアウト
  2. Node.js環境をセットアップ
  3. 依存関係をインストール
  4. スクリプトを実行して`public/daily-challenge.json`を更新
  5. 変更をコミット・プッシュ

## トラブルシューティング

### Wikipedia APIへのアクセスエラー

Wikipedia APIが一時的に利用できない場合、スクリプトはエラーで終了します。GitHub Actionsは翌日再試行します。

### 有効な記事が見つからない

MAX_SEARCH_OFFSET（デフォルト: 500）の範囲内に有効な記事が見つからない場合、エラーが発生します。この場合は、スクリプトのロジックを確認してください。

## 技術詳細

- **TypeScript**: スクリプトはTypeScriptで記述され、`tsx`パッケージで実行されます
- **Wikipedia API**: `action=query&pageids=...`エンドポイントを使用して記事のメタデータを取得
- **並列処理**: 複数のページIDを並列で取得して効率を向上
