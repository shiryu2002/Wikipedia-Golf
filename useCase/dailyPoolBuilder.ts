/**
 * Daily pool builder — script-only (never imported by the browser).
 *
 * Collects the members of the "good article" / "featured article" categories,
 * inspects each one once, and writes a compact pool file that the client can
 * pick from deterministically by date (see useCase/dailyChallenge.ts).
 *
 * Per article we record how many articles link to it (goal reachability) and
 * how many article links it has (start playability). Redirects,
 * disambiguation pages and list articles are dropped. Thresholds are NOT
 * applied here — they live in the client, so tuning them needs no rebuild.
 */

import {
  DAILY_POOL_FILE_VERSION,
  type DailyPoolArticleTuple,
  type DailyPoolFile,
  type Locale,
} from "./dailyChallenge";

const POOL_CATEGORIES: Record<Locale, string[]> = {
  ja: ["Category:良質な記事", "Category:秀逸な記事"],
  en: ["Category:Good articles", "Category:Featured articles"],
};

const LIST_TITLE_PATTERN = /一覧|^List of |^Lists of /;

const USER_AGENT = "Wikipedia-Golf-Pool-Builder/3.0 (https://github.com/shiryu2002/Wikipedia-Golf)";
const REQUEST_GAP_MS = 180;
const MAX_RETRIES = 4;

export type Logger = (message: string) => void;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

type ApiResponse = {
  query?: {
    pages?: WikiPage[];
    categorymembers?: { pageid: number; title: string }[];
    backlinks?: { pageid: number; title: string }[];
  };
  continue?: Record<string, string>;
  error?: { code?: string; info?: string };
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
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Wikipedia API request failed");
};

/** All articles in the source categories (ids + titles), lists removed. */
export const fetchCandidates = async (locale: Locale, log: Logger = () => {}) => {
  const seen = new Map<number, string>();
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
        if (!LIST_TITLE_PATTERN.test(member.title)) seen.set(member.pageid, member.title);
      }
      cmcontinue = json.continue?.cmcontinue;
    } while (cmcontinue);
    log(`${category}: 累計 ${seen.size} 件`);
  }
  return Array.from(seen, ([id, title]) => ({ id, title })).sort((a, b) => a.id - b.id);
};

type Inspection =
  | { ok: true; tuple: DailyPoolArticleTuple }
  | { ok: false; reason: string };

/** One request per article: page flags + outgoing article links + incoming article links. */
export const inspectArticle = async (locale: Locale, id: number, title: string): Promise<Inspection> => {
  const json = await api(locale, {
    action: "query",
    pageids: String(id),
    prop: "info|pageprops|links",
    ppprop: "disambiguation",
    plnamespace: "0",
    pllimit: "500",
    list: "backlinks",
    bltitle: title,
    blnamespace: "0",
    blfilterredir: "nonredirects",
    bllimit: "500",
  });
  const page = json.query?.pages?.[0];
  if (!page || page.missing !== undefined || page.invalid !== undefined) return { ok: false, reason: "存在しない" };
  if (page.ns !== 0) return { ok: false, reason: `名前空間 ${page.ns}` };
  if (page.redirect !== undefined) return { ok: false, reason: "リダイレクト" };
  if (page.pageprops && "disambiguation" in page.pageprops) return { ok: false, reason: "曖昧さ回避" };
  if (LIST_TITLE_PATTERN.test(page.title)) return { ok: false, reason: "一覧記事" };

  const outlinks = page.links?.length ?? 0;
  const backlinks = json.query?.backlinks?.length ?? 0;
  return { ok: true, tuple: [page.pageid ?? id, page.title, backlinks, outlinks] };
};

export const buildDailyPool = async (locale: Locale, log: Logger = () => {}): Promise<DailyPoolFile> => {
  const candidates = await fetchCandidates(locale, log);
  log(`検査開始: ${candidates.length} 件（1件あたり1リクエスト）`);

  const articles: DailyPoolArticleTuple[] = [];
  const rejected: Record<string, number> = {};
  let failures = 0;

  for (let index = 0; index < candidates.length; index += 1) {
    const { id, title } = candidates[index];
    try {
      const result = await inspectArticle(locale, id, title);
      if (result.ok) {
        articles.push(result.tuple);
      } else {
        rejected[result.reason] = (rejected[result.reason] ?? 0) + 1;
      }
    } catch (error) {
      failures += 1;
      log(`  取得失敗: ${title} (${error instanceof Error ? error.message : String(error)})`);
    }
    if ((index + 1) % 100 === 0 || index === candidates.length - 1) {
      log(`  ${index + 1}/${candidates.length} 件検査済み（採用 ${articles.length}）`);
    }
  }

  log(`除外: ${JSON.stringify(rejected)}  取得失敗: ${failures}`);
  if (articles.length < 200) {
    throw new Error(`プールが小さすぎます (${articles.length} 件)`);
  }

  return {
    version: DAILY_POOL_FILE_VERSION,
    locale,
    generatedAt: new Date().toISOString(),
    sources: POOL_CATEGORIES[locale],
    articles,
  };
};
