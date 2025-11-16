export type DailyChallengeEntry = {
  id: number;
  title: string;
};

export type DailyChallenge = {
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

const MAX_SEARCH_OFFSET = 500;
const PAGEID_CHUNK_SIZE = 50;
const MAX_CONCURRENT_BATCHES = 5;
const ARTICLE_FETCH_TIMEOUT_MS = 2000;
const ARTICLE_FETCH_MAX_ATTEMPTS = 5;

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
  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);
  const baseId = computeDailyBaseId(today);

  const goal = await findExistingPage(locale, baseId + 100);
  const start = await findExistingPage(locale, goal.id + 1000);

  return {
    locale,
    date: isoDate,
    goal,
    start,
  };
};
