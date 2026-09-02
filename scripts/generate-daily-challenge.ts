/**
 * Daily Challenge Generator
 *
 * Tops up public/daily-challenge.json so it always holds today plus the next
 * BUFFER_DAYS-1 days. Entries for past days are dropped; existing future
 * entries are kept as-is (so a hole never changes once published).
 *
 *   npx tsx scripts/generate-daily-challenge.ts [output-path] [--days N] [--today YYYY-MM-DD]
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

import { getJstDateString, isDailyChallengeFile, type DailyChallengeFile } from "../useCase/dailyChallenge";
import { BUFFER_DAYS, topUpChallengeFile } from "../useCase/dailyChallengeGenerator";

const parseArgs = (argv: string[]) => {
  let outputPath = "./public/daily-challenge.json";
  let days = BUFFER_DAYS;
  let today = getJstDateString();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--days") {
      days = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--today") {
      today = argv[index + 1];
      index += 1;
    } else if (!arg.startsWith("--")) {
      outputPath = arg;
    }
  }
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new Error(`--days は 1〜60 で指定してください (${days})`);
  }
  return { outputPath, days, today };
};

const readExisting = async (outputPath: string): Promise<DailyChallengeFile | null> => {
  try {
    const raw = await readFile(outputPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (isDailyChallengeFile(parsed)) return parsed;
    console.log("既存ファイルは旧形式のため作り直します。");
    return null;
  } catch {
    return null;
  }
};

const main = async () => {
  const { outputPath, days, today } = parseArgs(process.argv.slice(2));
  console.log(`=== デイリーチャレンジ生成 ===`);
  console.log(`今日 (JST): ${today}  バッファ: ${days} 日  出力: ${outputPath}`);

  const existing = await readExisting(outputPath);
  const file = await topUpChallengeFile("ja", existing, today, { days, log: (message) => console.log(message) });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(file, null, 2)}\n`, "utf-8");

  console.log(`\n=== 保存しました: ${outputPath} ===`);
  for (const [date, day] of Object.entries(file.days)) {
    console.log(`${date}  ${day.start.title}  →  ${day.goal.title}`);
  }
};

main().catch((error) => {
  console.error("\n✗ エラーが発生しました:", error);
  process.exit(1);
});
