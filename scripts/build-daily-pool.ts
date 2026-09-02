/**
 * Build the daily-challenge pool.
 *
 *   npx tsx scripts/build-daily-pool.ts [output-path]
 *
 * Inspects every "good" / "featured" article once (≈2,600 requests, about
 * 10 minutes) and writes public/daily-pool.json. The client picks today's
 * start and goal from this file by hashing the date, so the file only needs
 * rebuilding when you want fresh candidates — it is not a daily job.
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { buildDailyPool } from "../useCase/dailyPoolBuilder";

const main = async () => {
  const outputPath = process.argv[2] ?? "./public/daily-pool.json";
  const startedAt = Date.now();
  console.log(`=== デイリープール生成 → ${outputPath} ===`);

  const pool = await buildDailyPool("ja", (message) => console.log(message));

  await mkdir(path.dirname(outputPath), { recursive: true });
  // Compact: one article per line keeps diffs readable without bloating the file.
  const body = [
    "{",
    `  "version": ${pool.version},`,
    `  "locale": ${JSON.stringify(pool.locale)},`,
    `  "generatedAt": ${JSON.stringify(pool.generatedAt)},`,
    `  "sources": ${JSON.stringify(pool.sources)},`,
    `  "articles": [`,
    pool.articles.map((tuple) => `    ${JSON.stringify(tuple)}`).join(",\n"),
    "  ]",
    "}",
    "",
  ].join("\n");
  await writeFile(outputPath, body, "utf-8");

  const seconds = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\n✓ ${pool.articles.length} 件を保存しました (${seconds} 秒, ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB)`);
};

main().catch((error) => {
  console.error("\n✗ エラーが発生しました:", error);
  process.exit(1);
});
