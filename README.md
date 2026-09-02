# Wikipedia-Golf

ウィキペディアのゴルフができるサイト

[ここから遊べるよ](https://wikipedia-golf.vercel.app/)

## 今日のお題について

「今日のお題」は毎日0時（JST）に切り替わります。サーバーも定期実行もありません。

- `public/daily-pool.json` に「良質な記事」「秀逸な記事」約 2,600 件（被リンク数・発リンク数つき）が入っています
- ブラウザが日付のハッシュでスタートとゴールを選びます。同じ日なら誰でも同じお題、過去の日付も再現できます
- ゴールは被リンク 20 件以上、スタートは発リンク 20 本以上の記事から選ばれます
- プールは必要なときだけ `npm run build-daily-pool`（または GitHub Actions の手動実行）で作り直します

詳細は [scripts/README.md](scripts/README.md) をご覧ください。
