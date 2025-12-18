/**
 * Daily Challenge Generator Script
 * 
 * This script generates a daily challenge for Wikipedia Golf by:
 * 1. Computing base IDs from the current date
 * 2. Finding valid Wikipedia articles (filtering out categories, user pages, etc.)
 * 3. Saving the result to public/daily-challenge.json
 */

type DailyChallengeEntry = {
  id: number;
  title: string;
};

type DailyChallenge = {
  locale: "ja" | "en";
  date: string;
  goal: DailyChallengeEntry;
  start: DailyChallengeEntry;
};

const DAILY_ID_MULTIPLIERS = {
  year: 10,
  month: 100,
  day: 1000,
} as const;

const API_BASE = (locale: "ja" | "en") =>
  `https://${locale}.wikipedia.org/w/api.php`;

const MAX_SEARCH_OFFSET = 5000; // Increased from 500 to handle sparse article ID ranges
const PAGEID_CHUNK_SIZE = 50;
const MAX_CONCURRENT_BATCHES = 1; // Reduced from 5 to avoid rate limiting

// Namespace 0 is main article namespace
// Other namespaces include: 1=Talk, 2=User, 3=User talk, 6=File, 10=Template, 14=Category, etc.
const ARTICLE_NAMESPACE = 0;

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const buildCandidateIds = (baseId: number): number[] => {
  const ids: number[] = [];
  for (let offset = 0; offset <= MAX_SEARCH_OFFSET; offset += 1) {
    if (offset === 0) {
      ids.push(baseId);
      continue;
    }

    ids.push(baseId + offset);
    if (baseId - offset > 0) {
      ids.push(baseId - offset);
    }
  }
  return ids;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchPageMetaBatch = async (
  locale: "ja" | "en",
  pageIds: number[],
  retries = 3,
): Promise<Record<string, any>> => {
  const queryIds = pageIds.join("|");
  const url = `${API_BASE(locale)}?action=query&format=json&pageids=${queryIds}&origin=*`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Wikipedia-Golf-Daily-Challenge/1.0 (https://github.com/shiryu2002/Wikipedia-Golf)',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read response body");
        throw new Error(
          `Failed to fetch page metadata (HTTP ${response.status}): ${errorText.slice(0, 200)}`
        );
      }
      
      const json = await response.json();
      if (json?.error) {
        throw new Error(
          `Wikipedia API error for ids ${queryIds}: ${json.error.code ?? "unknown"} - ${json.error.info ?? ""}`,
        );
      }
      return json?.query?.pages ?? {};
    } catch (error) {
      if (attempt < retries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`Retry ${attempt + 1}/${retries - 1} - waiting ${waitTime}ms...`);
        await sleep(waitTime);
      } else {
        throw error;
      }
    }
  }
  
  // TypeScript requires a return/throw here, though this is unreachable in practice
  throw new Error(`Failed to fetch after ${retries} attempts`);
};

const isValidArticlePage = (page: any): boolean => {
  // Check if page exists
  if (!page || page.missing || page.invalid) {
    return false;
  }

  // Check if the page has a title (required for JSON serialization)
  if (!page.title) {
    console.log(`記事ID ${page.pageid} にタイトルがありません。スキップします。`);
    return false;
  }

  // Check if the page title contains "削除依頼" or starts with "Wikipedia:" prefix
  // This catches both regular deletion requests and Wikipedia namespace pages
  if (page.title.includes("削除依頼") || page.title.startsWith("Wikipedia:")) {
    console.log(`記事ID ${page.pageid} (${page.title}) は削除依頼またはWikipedia名前空間ページです。スキップします。`);
    return false;
  }

  // Check if it's in the main article namespace (namespace 0)
  // This is a secondary check in case namespace info is available
  if (page.ns !== undefined && page.ns !== ARTICLE_NAMESPACE) {
    console.log(`記事ID ${page.pageid} (${page.title}) は名前空間 ${page.ns} です。スキップします。`);
    return false;
  }

  return true;
};

const findValidArticlePage = async (
  locale: "ja" | "en",
  baseId: number,
): Promise<DailyChallengeEntry> => {
  const candidates = buildCandidateIds(baseId);
  const candidateChunks = chunkArray(candidates, PAGEID_CHUNK_SIZE);

  for (let index = 0; index < candidateChunks.length; index += MAX_CONCURRENT_BATCHES) {
    const chunkBatch = candidateChunks.slice(index, index + MAX_CONCURRENT_BATCHES);
    
    // Add delay between batches to avoid rate limiting
    if (index > 0) {
      await sleep(1000); // 1 second delay between batch groups
    }
    
    const batchResults = await Promise.all(
      chunkBatch.map(async (chunk) => {
        try {
          return await fetchPageMetaBatch(locale, chunk);
        } catch (error) {
          console.error("ページメタデータの取得に失敗しました", error);
          return null;
        }
      }),
    );

    for (let batchIndex = 0; batchIndex < chunkBatch.length; batchIndex += 1) {
      const chunk = chunkBatch[batchIndex];
      const pages = batchResults[batchIndex];
      if (!pages) {
        continue;
      }

      for (const candidateId of chunk) {
        const page = pages?.[String(candidateId)];
        if (isValidArticlePage(page)) {
          console.log(`✓ 有効な記事を発見: ID ${page.pageid} - ${page.title}`);
          return {
            id: page.pageid ?? candidateId,
            title: page.title,
          };
        }
      }
    }
  }

  throw new Error(`Could not resolve a valid Wikipedia article near id ${baseId}`);
};

/**
 * Compute a base page ID from the given date.
 * The formula creates a pseudo-random but deterministic ID based on date components.
 * The final multiplication by day adds additional variation to spread IDs across the Wikipedia page ID space.
 */
const computeDailyBaseId = (date: Date): number => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const result = (year * DAILY_ID_MULTIPLIERS.year + month * DAILY_ID_MULTIPLIERS.month + day * DAILY_ID_MULTIPLIERS.day) * day;

  return result;
};

/**
 * Get the current date in JST timezone as a Date object.
 * This function properly handles timezone conversion by formatting the date
 * components individually in JST and constructing a new Date.
 */
const getJapanTodayDate = (): Date => {
  const now = new Date();
  
  // Get date components in JST timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0", 10);
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0", 10);
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0", 10);
  
  // Create a Date object representing midnight JST for the current day
  return new Date(year, month - 1, day);
};

const generateDailyChallenge = async (
  locale: "ja" | "en" = "ja",
): Promise<DailyChallenge> => {
  const today = getJapanTodayDate();
  const isoDate = today.toISOString().slice(0, 10);
  const baseId = computeDailyBaseId(today);

  console.log(`\n=== デイリーチャレンジ生成開始 ===`);
  console.log(`日付: ${isoDate}`);
  console.log(`ベースID: ${baseId}`);
  console.log(`ロケール: ${locale}`);

  console.log(`\nゴール記事を検索中...`);
  const goal = await findValidArticlePage(locale, baseId + 100);

  console.log(`\nスタート記事を検索中...`);
  const start = await findValidArticlePage(locale, goal.id + 1000);

  console.log(`\n=== 生成完了 ===`);
  console.log(`ゴール: ${goal.title} (ID: ${goal.id})`);
  console.log(`スタート: ${start.title} (ID: ${start.id})`);

  return {
    locale,
    date: isoDate,
    goal,
    start,
  };
};

const saveToFile = async (challenge: DailyChallenge, outputPath: string): Promise<void> => {
  const fs = await import("fs/promises");
  const path = await import("path");
  
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  
  await fs.writeFile(
    outputPath,
    JSON.stringify(challenge, null, 2),
    "utf-8"
  );
  
  console.log(`\n✓ ファイルに保存しました: ${outputPath}`);
};

const main = async () => {
  try {
    const challenge = await generateDailyChallenge("ja");
    const outputPath = process.argv[2] || "./public/daily-challenge.json";
    await saveToFile(challenge, outputPath);
  } catch (error) {
    console.error("\n✗ エラーが発生しました:", error);
    process.exit(1);
  }
};

main();
