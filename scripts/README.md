# Daily Challenge Generation Script

`generate-daily-challenge.ts` は「今日のお題」を先読みで生成し、`public/daily-challenge.json` を更新します。

## 仕組み

- ファイルは **日付 → お題** の表で、常に「今日から 14 日分」を保持します（ローリングバッファ）。
- 実行すると、過去の日付を捨て、足りない日付だけを新たに生成します。すでに載っている日のお題は変えません。
- クライアントは今日の日付のエントリを読むだけで、ブラウザ側で記事を探索することはありません。

### お題の選び方

1. 候補プール = `Category:良質な記事` と `Category:秀逸な記事` の記事（約 2,600 件）。一覧記事は除外。
2. 日付のハッシュ（FNV-1a）でプール内の開始位置を決め、条件を満たす記事が見つかるまで順に調べます。
3. **ゴール**: リダイレクト・曖昧さ回避でなく、記事からの被リンクが 50 件以上（到達可能であること）。
4. **スタート**: リダイレクト・曖昧さ回避でなく、記事への発リンクが 30 本以上。ゴールへ直接リンクしていないこと（最低 2 打）。

選定ロジック本体は `useCase/dailyChallengeGenerator.ts` にあり、スクリプトは薄い CLI です。

### ファイル形式

```json
{
  "version": 2,
  "locale": "ja",
  "generatedAt": "2026-09-03T00:00:00.000Z",
  "days": {
    "2026-09-03": {
      "start": { "id": 123, "title": "..." },
      "goal": { "id": 456, "title": "..." },
      "stats": { "goalBacklinks": 210, "startOutlinks": 340 }
    }
  }
}
```

## 使用方法

```bash
npm run generate-daily
# または
npx tsx scripts/generate-daily-challenge.ts public/daily-challenge.json --days 14
```

オプション:

- `--days N` … 保持する日数（既定 14、1〜60）
- `--today YYYY-MM-DD` … 「今日」を上書き（検証用）

## GitHub Actions

`.github/workflows/update-daily-challenge.yml` が毎日 0 時（JST）に実行し、1 日分を補充してコミットします。
バッファがあるため、Actions が数日失敗しても「今日のお題」は途切れません。

## Wikipedia API について

- 逐次リクエスト（約 4 req/s 以下）、User-Agent 付き、429 やエラー時は指数バックオフで再試行します。
- 初回（14 日分をまとめて生成）でおおよそ 100〜150 リクエスト、日次では 10 リクエスト前後です。
