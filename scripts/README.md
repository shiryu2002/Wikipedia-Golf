# Daily Pool Builder

`build-daily-pool.ts` は「今日のお題」の候補プール `public/daily-pool.json` を作ります。**毎日実行するものではありません。**

## 仕組み

- 今日のお題は、ブラウザが `daily-pool.json` を読み、**日付のハッシュだけ**でスタートとゴールを選びます（`useCase/dailyChallenge.ts` の `pickDailyChallenge`）。
- 同じプールと同じ日付なら誰が計算しても同じお題になり、過去の日付も再現できます。サーバーも cron も不要です。
- プールは `Category:良質な記事` と `Category:秀逸な記事` の全記事（約 2,600 件）を 1 件ずつ検査したもので、リダイレクト・曖昧さ回避・一覧記事を除き、各記事の「記事からの被リンク数」「記事への発リンク数」を記録しています（いずれも上限 500）。
- 採用のしきい値はクライアント側の定数です（`GOAL_MIN_BACKLINKS = 20`, `START_MIN_OUTLINKS = 20`）。変えてもプールの作り直しは不要です。

### ファイル形式

```json
{
  "version": 3,
  "locale": "ja",
  "generatedAt": "2026-09-03T00:00:00.000Z",
  "sources": ["Category:良質な記事", "Category:秀逸な記事"],
  "articles": [
    [229354, "(25143) イトカワ", 312, 145],
    ...
  ]
}
```

各要素は `[ページID, タイトル, 被リンク数, 発リンク数]` です。約 90KB（gzip 後 30KB 台）。

## 使用方法

```bash
npm run build-daily-pool
# または
npx tsx scripts/build-daily-pool.ts public/daily-pool.json
```

約 2,600 リクエスト（逐次、User-Agent 付き、失敗時は指数バックオフ）で 10 分弱かかります。

## いつ作り直すか

- 良質な記事が増えて候補を増やしたいとき
- 記事の削除やリダイレクト化が目立ってきたとき（削除された記事が選ばれた日は、ゲーム画面で「記事を読み込めませんでした」になります）

GitHub Actions の `Rebuild Daily Pool` ワークフローを手動実行するか、ローカルで実行してコミットしてください。
