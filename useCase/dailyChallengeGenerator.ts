/**
 * Daily challenge generator — the single implementation used by
 * scripts/generate-daily-challenge.ts (and nothing in the browser).
 *
 * Selection:
 *   1. Candidate pool = members of the "good article" / "featured article"
 *      categories (≈2,600 articles on ja.wikipedia). These are well written,
 *      well linked, and never stubs, redirects or disambiguation pages.
 *   2. For each date, a hash of the date picks a starting index into the
 *      pool for the goal and (separately) for the start. We probe forward
 *      from there until a candidate passes the checks below.
 *   3. Goal must have ≥ MIN_GOAL_BACKLINKS articles linking to it (so it is
 *      reachable). Start must have ≥ MIN_START_OUTLINKS article links and
 *      must not link directly to the goal (so the hole is at least 2 shots).
 *
 * Output is a rolling buffer of BUFFER_DAYS days so the app never has to
 * compute a challenge on the fly.
 */

import {
  addDays,
  DAILY_CHALLENGE_FILE_VERSION,
  type DailyChallengeDay,
  type DailyChallengeEntry,
  type DailyChallengeFile,
  type Locale,
} from "./dailyChallenge";

export const BUFFER_DAYS = 14;
export const MIN_GOAL_BACKLINKS = 50;
export const MIN_START_OUTLINKS = 30;

const POOL_CATEGORIES: Record<Locale, string[]> = {
  ja: ["Category:良質な記事", "Category:秀逸な記事"],
  en: ["Category:Good articles", "Category:Featured articles"],
};

/** Lists make dull starts (hundreds of links) and odd goals. */
const LIST_TITLE_PATTERN = /一覧|^List of |^Lists of /;

const USER_AGENT = "Wikipedia-Golf-Daily-Challenge/2.0 (https://github.com/shiryu2002/Wikipedia-Golf)";
const REQUEST_GAP_MS = 250;
const MAX_RETRIES = 4;

export type Logger = (message: string) => void;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* API client (sequential, polite, retrying)                             */
/* ------------------------------------------------------------------ */

type ApiResponse = {
  query?: {
    pages?: Record<string, WikiPage>;
    categorymembers?: { pageid: number; title: string }[];
    backlinks?: { pageid: number; title: string }[];
  };
  continue?: Record<string, string>;
  error?: { code?: string; info?: string };
};

type WikiPage = {
  pageid?: number;
  ns?: number;
  title: string;
  missing?: unknown;
  invalid?: unknown;
  redirect?: unknown;
  pageprops?: Record<string, string>;
  links?: { title: string }[];
};

let lastRequestAt = 0;

const api = async (locale: Locale, params: Record<string, string>): Promise<ApiResponse> => {
  const url = `https://${locale}.wikipedia.org/w/api.php?${new URLSearchParams({
    format: "json",
    formatversion: "2",
    ...params,
  }).toString()}`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const wait = Math.max(0, lastRequestAt + REQUEST_GAP_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();

    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT } });
      const text = await response.text();
      if (!response.ok || text.startsWith("You are making too many requests")) {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
      }
      const json = JSON.parse(text) as ApiResponse;
      if (json.error) {
        throw new Error(`API error ${json.error.code ?? "unknown"}: ${json.error.info ?? ""}`);
      }
      return json;
    } catch (error) {
      lastError = error;
      const backoff = 1000 * 2 ** attempt;
      await sleep(backoff);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Wikipedia API request failed");
};

/* ------------------------------------------------------------------ */
/* Candidate pool                                                        */
/* ------------------------------------------------------------------ */

export const fetchCandidatePool = async (locale: Locale, log: Logger = () => {}): Promise<DailyChallengeEntry[]> => {
  const seen = new Map<number, DailyChallengeEntry>();

  for (const category of POOL_CATEGORIES[locale]) {
    let cmcontinue: string | undefined;
    do {
      const json = await api(locale, {
        action: "query",
        list: "categorymembers",
        cmtitle: category,
        cmnamespace: "0",
        cmlimit: "500",
        cmprop: "ids|title",
        ...(cmcontinue ? { cmcontinue } : {}),
      });
      for (const member of json.query?.categorymembers ?? []) {
        if (!LIST_TITLE_PATTERN.test(member.title)) {
          seen.set(member.pageid, { id: member.pageid, title: member.title });
        }
      }
      cmcontinue = json.continue?.cmcontinue;
    } while (cmcontinue);
    log(`${category}: 累計 ${seen.size} 件`);
  }

  if (seen.size < 100) {
    throw new Error(`候補プールが小さすぎます (${seen.size} 件)`);
  }
  // Stable order so the same date maps to the same neighbourhood of the pool.
  return Array.from(seen.values()).sort((a, b) => a.id - b.id);
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

/* ------------------------------------------------------------------ */
/* Checks                                                                */
/* ------------------------------------------------------------------ */

type Rejection = { ok: false; reason: string };
type GoalCheck = { ok: true; backlinks: number } | Rejection;
type StartCheck = { ok: true; outlinks: number } | Rejection;

const basicProblem = (page: WikiPage | undefined): string | null => {
  if (!page || page.missing !== undefined || page.invalid !== undefined) return "存在しない";
  if (page.ns !== 0) return `名前空間 ${page.ns}`;
  if (page.redirect !== undefined) return "リダイレクト";
  if (page.pageprops && "disambiguation" in page.pageprops) return "曖昧さ回避";
  if (LIST_TITLE_PATTERN.test(page.title)) return "一覧記事";
  return null;
};

const inspectGoal = async (locale: Locale, candidate: DailyChallengeEntry): Promise<GoalCheck> => {
  const json = await api(locale, {
    action: "query",
    pageids: String(candidate.id),
    prop: "info|pageprops",
    ppprop: "disambiguation",
    list: "backlinks",
    bltitle: candidate.title,
    blnamespace: "0",
    blfilterredir: "nonredirects",
    bllimit: "500",
  });
  const page = json.query?.pages?.[0] ?? Object.values(json.query?.pages ?? {})[0];
  const problem = basicProblem(page);
  if (problem) return { ok: false, reason: problem };
  const backlinks = json.query?.backlinks?.length ?? 0;
  if (backlinks < MIN_GOAL_BACKLINKS) return { ok: false, reason: `被リンク ${backlinks} 件` };
  return { ok: true, backlinks };
};

const inspectStart = async (
  locale: Locale,
  candidate: DailyChallengeEntry,
  goal: DailyChallengeEntry,
): Promise<StartCheck> => {
  if (candidate.id === goal.id) return { ok: false, reason: "ゴールと同じ" };

  const json = await api(locale, {
    action: "query",
    pageids: String(candidate.id),
    prop: "info|pageprops|links",
    ppprop: "disambiguation",
    plnamespace: "0",
    pllimit: "500",
  });
  const page = json.query?.pages?.[0] ?? Object.values(json.query?.pages ?? {})[0];
  const problem = basicProblem(page);
  if (problem) return { ok: false, reason: problem };
  const outlinks = page?.links?.length ?? 0;
  if (outlinks < MIN_START_OUTLINKS) return { ok: false, reason: `発リンク ${outlinks} 本` };

  // A direct link would make it a one-shot hole.
  const direct = await api(locale, {
    action: "query",
    pageids: String(candidate.id),
    prop: "links",
    pltitles: goal.title,
    plnamespace: "0",
  });
  const directPage = direct.query?.pages?.[0] ?? Object.values(direct.query?.pages ?? {})[0];
  if ((directPage?.links?.length ?? 0) > 0) return { ok: false, reason: "ゴールへ直接リンク" };

  return { ok: true, outlinks };
};

/* ------------------------------------------------------------------ */
/* Generation                                                            */
/* ------------------------------------------------------------------ */

const MAX_PROBES = 40;

export const generateDay = async (
  locale: Locale,
  date: string,
  pool: DailyChallengeEntry[],
  log: Logger = () => {},
): Promise<DailyChallengeDay> => {
  if (pool.length === 0) throw new Error("候補プールが空です");

  let goal: DailyChallengeEntry | null = null;
  let goalBacklinks = 0;
  const goalOffset = hashString(`${date}|goal`) % pool.length;
  for (let probe = 0; probe < MAX_PROBES && !goal; probe += 1) {
    const candidate = pool[(goalOffset + probe) % pool.length];
    const check = await inspectGoal(locale, candidate);
    if (check.ok) {
      goal = candidate;
      goalBacklinks = check.backlinks;
    } else {
      log(`  ゴール候補を除外: ${candidate.title} (${check.reason})`);
    }
  }
  if (!goal) throw new Error(`${date}: ゴールが見つかりませんでした`);

  let start: DailyChallengeEntry | null = null;
  let startOutlinks = 0;
  const startOffset = hashString(`${date}|start`) % pool.length;
  for (let probe = 0; probe < MAX_PROBES && !start; probe += 1) {
    const candidate = pool[(startOffset + probe) % pool.length];
    const check = await inspectStart(locale, candidate, goal);
    if (check.ok) {
      start = candidate;
      startOutlinks = check.outlinks;
    } else {
      log(`  スタート候補を除外: ${candidate.title} (${check.reason})`);
    }
  }
  if (!start) throw new Error(`${date}: スタートが見つかりませんでした`);

  return { start, goal, stats: { goalBacklinks, startOutlinks } };
};

/**
 * Keep today's and future entries from the existing file, generate whatever
 * is missing up to BUFFER_DAYS ahead, and return the new file contents.
 */
export const topUpChallengeFile = async (
  locale: Locale,
  existing: DailyChallengeFile | null,
  today: string,
  options: { days?: number; log?: Logger; pool?: DailyChallengeEntry[] } = {},
): Promise<DailyChallengeFile> => {
  const days = options.days ?? BUFFER_DAYS;
  const log = options.log ?? (() => {});

  const kept: Record<string, DailyChallengeDay> = {};
  if (existing && existing.locale === locale) {
    for (const [date, day] of Object.entries(existing.days)) {
      if (date >= today) kept[date] = day;
    }
  }

  const missing: string[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(today, offset);
    if (!kept[date]) missing.push(date);
  }
  log(`保持: ${Object.keys(kept).length} 日, 生成: ${missing.length} 日`);

  if (missing.length > 0) {
    const pool = options.pool ?? (await fetchCandidatePool(locale, log));
    for (const date of missing) {
      log(`${date} を生成中…`);
      const day = await generateDay(locale, date, pool, log);
      kept[date] = day;
      log(`  ${day.start.title} → ${day.goal.title} (被リンク ${day.stats?.goalBacklinks}, 発リンク ${day.stats?.startOutlinks})`);
    }
  }

  const sortedDays = Object.fromEntries(Object.entries(kept).sort(([a], [b]) => (a < b ? -1 : 1)));
  return {
    version: DAILY_CHALLENGE_FILE_VERSION,
    locale,
    generatedAt: new Date().toISOString(),
    days: sortedDays,
  };
};
