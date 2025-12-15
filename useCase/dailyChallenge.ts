export type DailyChallengeEntry = {
  id: number;
  title: string;
};

export type DailyChallenge = {
  locale: "ja" | "en";
  date: string;
  goal: DailyChallengeEntry;
  start: DailyChallengeEntry;
  /**
   * Indicates if this challenge was loaded from pre-generated JSON file.
   * 
   * When true:
   * - Set by `fetchDailyChallengeFromJson` when loading from `/daily-challenge.json`
   * - Causes `loadDailyChallengeWithCache` to skip goal article verification via Wikipedia API
   * - Improves loading speed by eliminating unnecessary API call (~1s saved)
   * 
   * When false/undefined:
   * - Challenge was generated via API fallback
   * - Goal article will be verified to ensure it's valid and parseable
   */
  fromJson?: boolean;
};

const DAILY_ID_MULTIPLIERS = {
  year: 10,
  month: 100,
  day: 1000,
} as const;

const API_BASE = (locale: "ja" | "en") =>
  `https://${locale}.wikipedia.org/w/api.php`;

const MAX_SEARCH_OFFSET = 500;
const PAGEID_CHUNK_SIZE = 50;
const MAX_CONCURRENT_BATCHES = 5;
const ARTICLE_FETCH_TIMEOUT_MS = 2000;
const ARTICLE_FETCH_MAX_ATTEMPTS = 50;

/**
 * Get current date in YYYY-MM-DD format for JST timezone
 */
const getJstDateString = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
};

/**
 * Fetch daily challenge from the pre-generated JSON file
 */
const fetchDailyChallengeFromJson = async (
  locale: "ja" | "en",
): Promise<DailyChallenge | null> => {
  try {
    const response = await fetch("/daily-challenge.json");
    if (!response.ok) {
      console.log("デイリーチャレンジJSONファイルが見つかりません。APIから生成します。");
      return null;
    }

    const data: DailyChallenge = await response.json();
    const today = getJstDateString();

    // Check if the JSON file is for today and matches the requested locale
    if (data.date === today && data.locale === locale) {
      console.log(`JSONファイルから今日のデイリーチャレンジを取得しました: ${data.date}`);
      // Mark as loaded from JSON to skip verification steps
      return { ...data, fromJson: true };
    }

    console.log(
      `JSONファイルの日付 (${data.date}) が今日 (${today}) と一致しないか、ロケールが異なります。APIから生成します。`
    );
    return null;
  } catch (error) {
    console.error("デイリーチャレンジJSONの読み込みに失敗しました:", error);
    return null;
  }
};

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

const fetchPageMetaBatch = async (
  locale: "ja" | "en",
  pageIds: number[],
): Promise<Record<string, any>> => {
  const queryIds = pageIds.join("|");
  const url = `${API_BASE(locale)}?action=query&format=json&pageids=${queryIds}&origin=*`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch page metadata for ids: ${queryIds}`);
  }
  const json = await response.json();
  if (json?.error) {
    throw new Error(
      `Wikipedia API error for ids ${queryIds}: ${json.error.code ?? "unknown"}`,
    );
  }
  return json?.query?.pages ?? {};
};

const findExistingPage = async (
  locale: "ja" | "en",
  baseId: number,
): Promise<DailyChallengeEntry> => {
  const candidates = buildCandidateIds(baseId);
  const candidateChunks = chunkArray(candidates, PAGEID_CHUNK_SIZE);

  for (let index = 0; index < candidateChunks.length; index += MAX_CONCURRENT_BATCHES) {
    const chunkBatch = candidateChunks.slice(index, index + MAX_CONCURRENT_BATCHES);
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
        if (page && !page.missing && !page.invalid) {
          return {
            id: page.pageid ?? candidateId,
            title: page.title,
          };
        }
      }
    }
  }

  throw new Error(`Could not resolve a Wikipedia page near id ${baseId}`);
};

const findParseablePage = async (
  locale: "ja" | "en",
  baseId: number,
): Promise<DailyChallengeEntry> => {
  const candidates = buildCandidateIds(baseId);
  
  // Try each candidate ID to find one that can be parsed
  for (const candidateId of candidates) {
    try {
      // First check if the page exists
      const metaResult = await fetchPageMetaBatch(locale, [candidateId]);
      const page = metaResult?.[String(candidateId)];
      
      if (page && !page.missing && !page.invalid) {
        const pageTitle = page.title;
        const pageId = page.pageid ?? candidateId;
        
        // Now try to parse it to make sure it's actually parseable
        try {
          await fetchPageParseWithFallback(locale, { 
            id: pageId,
            title: pageTitle 
          }, { maxAttempts: 1 });
          
          // If we got here, the page is parseable
          return {
            id: pageId,
            title: pageTitle,
          };
        } catch (parseError) {
          // This page exists but can't be parsed, try next candidate
          console.log(`記事ID ${pageId} (${pageTitle}) は解析できません。次の候補を試します...`);
          continue;
        }
      }
    } catch (error) {
      // Failed to check this candidate, try next
      continue;
    }
  }

  throw new Error(`Could not resolve a parseable Wikipedia page near id ${baseId}`);
};

const computeDailyBaseId = (date: Date): number => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const result = (year * DAILY_ID_MULTIPLIERS.year + month * DAILY_ID_MULTIPLIERS.month + day * DAILY_ID_MULTIPLIERS.day) * day;

  return result;
};

type ArticleIdentifier = {
  id?: number;
  title: string;
};

type ArticleParseResult = {
  id?: number;
  title: string;
  html: string;
};

const buildParseUrl = (
  locale: "ja" | "en",
  identifier: ArticleIdentifier,
): string => {
  if (identifier.id !== undefined) {
    return `${API_BASE(locale)}?action=parse&pageid=${identifier.id}&format=json&origin=*`;
  }
  return `${API_BASE(locale)}?action=parse&page=${encodeURIComponent(identifier.title)}&format=json&origin=*`;
};

const createAbortControllerWithTimeout = () => {
  if (typeof AbortController === "undefined") {
    return { controller: undefined, timeoutId: undefined } as const;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, ARTICLE_FETCH_TIMEOUT_MS);
  return { controller, timeoutId } as const;
};

export const fetchPageParseWithFallback = async (
  locale: "ja" | "en",
  identifier: ArticleIdentifier,
  options?: {
    maxAttempts?: number;
  },
): Promise<ArticleParseResult> => {
  const maxAttempts = identifier.id !== undefined
    ? options?.maxAttempts ?? ARTICLE_FETCH_MAX_ATTEMPTS
    : 1;

  let candidateId = identifier.id;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const currentIdentifier: ArticleIdentifier = {
      id: candidateId,
      title: identifier.title,
    };
    const requestUrl = buildParseUrl(locale, currentIdentifier);
    const { controller, timeoutId } = createAbortControllerWithTimeout();

    try {
      if (currentIdentifier.id !== undefined) {
        console.log(`記事ID: ${currentIdentifier.id} を取得中...`);
      } else {
        console.log(`記事タイトル: ${currentIdentifier.title} を取得中...`);
      }

      const response = await fetch(requestUrl, controller ? { signal: controller.signal } : undefined);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (!response.ok) {
        throw new Error(`Failed to parse article for ${currentIdentifier.id ?? currentIdentifier.title}`);
      }
      const data = await response.json();
      if (data?.error) {
        throw new Error(data.error.info ?? "Wikipedia parse API error");
      }
      if (!data?.parse?.text?.["*"]) {
        throw new Error("Article content is empty");
      }

      return {
        id: data.parse?.pageid ?? currentIdentifier.id,
        title: data.parse?.title ?? identifier.title,
        html: data.parse.text["*"],
      };
    } catch (error) {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      lastError = error;
      if (candidateId === undefined || attempt === maxAttempts - 1) {
        throw error;
      }
      candidateId = candidateId + 1;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to resolve article parse");
};

export const fetchDailyChallenge = async (
  locale: "ja" | "en" = "ja",
): Promise<DailyChallenge> => {
  // Try to fetch from pre-generated JSON file first
  const jsonChallenge = await fetchDailyChallengeFromJson(locale);
  if (jsonChallenge) {
    return jsonChallenge;
  }

  // Fallback to API generation
  console.log("APIからデイリーチャレンジを生成します...");
  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);
  const baseId = computeDailyBaseId(today);

  const goal = await findExistingPage(locale, baseId + 100);
  const start = await findParseablePage(locale, goal.id + 1000);

  return {
    locale,
    date: isoDate,
    goal,
    start,
  };
};
