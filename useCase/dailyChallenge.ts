/**
 * Daily challenge — shared types, date helpers, the client-side loader for
 * the pre-generated challenge file, and article fetching.
 *
 * The challenge file (public/daily-challenge.json) is a rolling buffer of
 * days generated ahead of time by scripts/generate-daily-challenge.ts, so the
 * client only ever looks up today's entry; it never has to compute anything.
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

export type DailyChallengeDay = {
  start: DailyChallengeEntry;
  goal: DailyChallengeEntry;
  stats?: DailyChallengeStats;
};

/** The challenge for one date, as consumed by the UI. */
export type DailyChallenge = DailyChallengeDay & {
  locale: Locale;
  date: string;
};

/** Shape of public/daily-challenge.json. */
export type DailyChallengeFile = {
  version: 2;
  locale: Locale;
  generatedAt: string;
  days: Record<string, DailyChallengeDay>;
};

export const DAILY_CHALLENGE_FILE_VERSION = 2 as const;
export const DAILY_CHALLENGE_PATH = "/daily-challenge.json";

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
/* Challenge file                                                        */
/* ------------------------------------------------------------------ */

const isEntry = (value: unknown): value is DailyChallengeEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as DailyChallengeEntry).id === "number" &&
  typeof (value as DailyChallengeEntry).title === "string" &&
  (value as DailyChallengeEntry).title.trim().length > 0;

export const isDailyChallengeFile = (value: unknown): value is DailyChallengeFile => {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Partial<DailyChallengeFile>;
  return (
    file.version === DAILY_CHALLENGE_FILE_VERSION &&
    (file.locale === "ja" || file.locale === "en") &&
    typeof file.days === "object" &&
    file.days !== null
  );
};

/** Pick one date out of the file. Returns null when the date is missing. */
export const pickDailyChallenge = (
  file: unknown,
  locale: Locale,
  date: string,
): DailyChallenge | null => {
  if (!isDailyChallengeFile(file) || file.locale !== locale) return null;
  const day = file.days[date];
  if (!day || !isEntry(day.start) || !isEntry(day.goal)) return null;
  return { locale, date, start: day.start, goal: day.goal, stats: day.stats };
};

/** Fetch the pre-generated file and return today's challenge. */
export const fetchDailyChallenge = async (
  locale: Locale = "ja",
  date: string = getJstDateString(),
): Promise<DailyChallenge> => {
  const response = await fetch(DAILY_CHALLENGE_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`デイリーチャレンジの読み込みに失敗しました (HTTP ${response.status})`);
  }
  const file = await response.json();
  const challenge = pickDailyChallenge(file, locale, date);
  if (!challenge) {
    throw new Error(`${date} のお題がまだ用意されていません`);
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
