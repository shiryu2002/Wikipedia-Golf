/**
 * Daily challenge — types, date helpers, the deterministic pick from the
 * pre-inspected article pool, and article fetching.
 *
 * public/daily-pool.json holds ~2,600 good/featured articles with their
 * backlink and outlink counts (built once by scripts/build-daily-pool.ts).
 * Today's hole is a pure function of (date, pool): hash the date, index into
 * the eligible goals and starts. No server, no cron, no API call needed to
 * know what today's hole is — and any past date can be recomputed.
 */

export type Locale = "ja" | "en";

export type DailyChallengeEntry = {
  id: number;
  title: string;
};

export type DailyChallengeStats = {
  /** Articles (non-redirects) linking to the goal, capped at 500. */
  goalBacklinks: number;
  /** Article links leaving the start page, capped at 500. */
  startOutlinks: number;
};

/** The challenge for one date, as consumed by the UI. */
export type DailyChallenge = {
  locale: Locale;
  date: string;
  start: DailyChallengeEntry;
  goal: DailyChallengeEntry;
  stats?: DailyChallengeStats;
};

/** [pageId, title, backlinks, outlinks] */
export type DailyPoolArticleTuple = [number, string, number, number];

export type DailyPoolFile = {
  version: 3;
  locale: Locale;
  generatedAt: string;
  sources: string[];
  articles: DailyPoolArticleTuple[];
};

export const DAILY_POOL_FILE_VERSION = 3 as const;
export const DAILY_POOL_PATH = "/daily-pool.json";

/** A goal must be reachable: at least this many articles link to it. */
export const GOAL_MIN_BACKLINKS = 20;
/** A start must give you somewhere to go. */
export const START_MIN_OUTLINKS = 20;

/* ------------------------------------------------------------------ */
/* Dates (the game day rolls over at midnight JST)                      */
/* ------------------------------------------------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in JST as YYYY-MM-DD. */
export const getJstDateString = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(now);

/** Add days to a YYYY-MM-DD string without touching time zones. */
export const addDays = (isoDate: string, days: number): string => {
  if (!ISO_DATE.test(isoDate)) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
};

/* ------------------------------------------------------------------ */
/* Deterministic pick                                                    */
/* ------------------------------------------------------------------ */

/** FNV-1a 32-bit. Small, deterministic, good enough for indexing a pool. */
export const hashString = (input: string): number => {
  let hash = 0x811c9dc5;
  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export const isDailyPoolFile = (value: unknown): value is DailyPoolFile => {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Partial<DailyPoolFile>;
  return (
    file.version === DAILY_POOL_FILE_VERSION &&
    (file.locale === "ja" || file.locale === "en") &&
    Array.isArray(file.articles) &&
    file.articles.length > 0
  );
};

const toEntry = (tuple: DailyPoolArticleTuple): DailyChallengeEntry => ({ id: tuple[0], title: tuple[1] });

/**
 * The hole for a given date. Pure: same pool + same date → same hole.
 * Returns null when the pool is unusable.
 */
export const pickDailyChallenge = (pool: unknown, locale: Locale, date: string): DailyChallenge | null => {
  if (!isDailyPoolFile(pool) || pool.locale !== locale || !ISO_DATE.test(date)) return null;

  const goals = pool.articles.filter((article) => article[2] >= GOAL_MIN_BACKLINKS);
  const starts = pool.articles.filter((article) => article[3] >= START_MIN_OUTLINKS);
  if (goals.length === 0 || starts.length < 2) return null;

  const goal = goals[hashString(`${date}|goal`) % goals.length];

  let startIndex = hashString(`${date}|start`) % starts.length;
  let start = starts[startIndex];
  if (start[0] === goal[0]) {
    startIndex = (startIndex + 1) % starts.length;
    start = starts[startIndex];
  }

  return {
    locale,
    date,
    start: toEntry(start),
    goal: toEntry(goal),
    stats: { goalBacklinks: goal[2], startOutlinks: start[3] },
  };
};

let poolPromise: Promise<unknown> | null = null;

/** Fetch (and memoise) the pool file. */
export const fetchDailyPool = async (): Promise<unknown> => {
  if (!poolPromise) {
    poolPromise = fetch(DAILY_POOL_PATH)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`お題プールの読み込みに失敗しました (HTTP ${response.status})`);
        }
        return response.json();
      })
      .catch((error) => {
        poolPromise = null;
        throw error;
      });
  }
  return poolPromise;
};

/** Today's (or the given date's) challenge. */
export const fetchDailyChallenge = async (
  locale: Locale = "ja",
  date: string = getJstDateString(),
): Promise<DailyChallenge> => {
  const pool = await fetchDailyPool();
  const challenge = pickDailyChallenge(pool, locale, date);
  if (!challenge) {
    throw new Error("お題プールを読み取れませんでした");
  }
  return challenge;
};

/* ------------------------------------------------------------------ */
/* Articles                                                              */
/* ------------------------------------------------------------------ */

export type ArticleIdentifier = {
  id?: number;
  title: string;
};

export type ArticleParseResult = {
  id?: number;
  /** Canonical title as returned by the API (after redirects). */
  title: string;
  html: string;
};

const ARTICLE_FETCH_TIMEOUT_MS = 15000;

const apiBase = (locale: Locale) => `https://${locale}.wikipedia.org/w/api.php`;

const buildParseUrl = (locale: Locale, identifier: ArticleIdentifier): string => {
  const params = new URLSearchParams({
    action: "parse",
    format: "json",
    origin: "*",
    // Follow redirects the way a click on Wikipedia would, instead of
    // landing on a one-line "転送先" stub.
    redirects: "1",
    prop: "text|title|pageid",
  });
  if (identifier.id !== undefined) {
    params.set("pageid", String(identifier.id));
  } else {
    params.set("page", identifier.title);
  }
  return `${apiBase(locale)}?${params.toString()}`;
};

const parseOnce = async (locale: Locale, identifier: ArticleIdentifier): Promise<ArticleParseResult> => {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
  const timeoutId = controller ? setTimeout(() => controller.abort(), ARTICLE_FETCH_TIMEOUT_MS) : undefined;
  try {
    const response = await fetch(buildParseUrl(locale, identifier), controller ? { signal: controller.signal } : undefined);
    if (!response.ok) {
      throw new Error(`記事の取得に失敗しました (HTTP ${response.status})`);
    }
    const data = await response.json();
    if (data?.error) {
      throw new Error(data.error.info ?? "Wikipedia parse API error");
    }
    const html: string | undefined = data?.parse?.text?.["*"];
    if (!html) {
      throw new Error("記事の本文が空です");
    }
    return {
      id: typeof data.parse?.pageid === "number" ? data.parse.pageid : identifier.id,
      title: typeof data.parse?.title === "string" && data.parse.title ? data.parse.title : identifier.title,
      html,
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};

/**
 * Fetch an article's rendered HTML. When a page id is given it is tried
 * first; if that fails (stale id, deleted page) the title is tried once.
 * There is deliberately no "try the next id" behaviour — that could load a
 * different article than the one requested.
 */
export const fetchArticle = async (locale: Locale, identifier: ArticleIdentifier): Promise<ArticleParseResult> => {
  const attempts: ArticleIdentifier[] =
    identifier.id !== undefined && identifier.title
      ? [identifier, { title: identifier.title }]
      : [identifier];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return await parseOnce(locale, attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("記事の取得に失敗しました");
};
