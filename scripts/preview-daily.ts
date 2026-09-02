/**
 * Preview upcoming daily holes from the pool without touching the network.
 *
 *   npx tsx scripts/preview-daily.ts [days=14] [from=today JST]
 */

import { readFile } from "fs/promises";

import {
  addDays,
  GOAL_MIN_BACKLINKS,
  getJstDateString,
  isDailyPoolFile,
  pickDailyChallenge,
  START_MIN_OUTLINKS,
} from "../useCase/dailyChallenge";

const main = async () => {
  const days = Number(process.argv[2] ?? 14);
  const from = process.argv[3] ?? getJstDateString();
  const pool: unknown = JSON.parse(await readFile("./public/daily-pool.json", "utf-8"));
  if (!isDailyPoolFile(pool)) throw new Error("public/daily-pool.json が読めません");

  const goals = pool.articles.filter((a) => a[2] >= GOAL_MIN_BACKLINKS).length;
  const starts = pool.articles.filter((a) => a[3] >= START_MIN_OUTLINKS).length;
  console.log(`プール ${pool.articles.length} 件 / ゴール候補 ${goals} 件 / スタート候補 ${starts} 件 (生成 ${pool.generatedAt})\n`);

  const seenGoals = new Map<number, string>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(from, offset);
    const hole = pickDailyChallenge(pool, "ja", date);
    if (!hole) throw new Error(`${date}: お題を決められません`);
    const again = pickDailyChallenge(pool, "ja", date);
    if (JSON.stringify(again) !== JSON.stringify(hole)) throw new Error(`${date}: 決定的ではありません`);
    const dup = seenGoals.get(hole.goal.id);
    seenGoals.set(hole.goal.id, date);
    console.log(
      `${date}  ${hole.start.title}  →  ${hole.goal.title}` +
        `  (被リンク ${hole.stats?.goalBacklinks}, 発リンク ${hole.stats?.startOutlinks})${dup ? `  ※ゴール重複: ${dup}` : ""}`,
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
