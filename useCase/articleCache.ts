/**
 * Module-level cache for Wikipedia fetches that survives client-side
 * navigation (home → game). Entries are promises, so concurrent callers
 * (a prefetch started on the home page and the game page mounting a second
 * later) share one request.
 */

import { type ArticleIdentifier, type ArticleParseResult, type DailyChallenge, type Locale, fetchArticle } from "./dailyChallenge";
import countReferer from "./referer";

export type GoalBacklinks = {
  numOfRef: number;
  hints: string[];
};

const MAX_ARTICLES = 40;
const MAX_BACKLINKS = 10;

const articles = new Map<string, Promise<ArticleParseResult>>();
const backlinks = new Map<string, Promise<GoalBacklinks>>();

const articleKey = (locale: Locale, identifier: ArticleIdentifier) =>
  identifier.id !== undefined ? `${locale}:id:${identifier.id}` : `${locale}:title:${identifier.title}`;

/** Re-insert to mark as recently used, then trim the oldest entries. */
const touch = <T>(map: Map<string, T>, key: string, value: T, max: number) => {
  map.delete(key);
  map.set(key, value);
  while (map.size > max) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
};

/** Fetch an article once; later calls (by id, requested title, or the resolved title) reuse it. */
export const loadArticle = (locale: Locale, identifier: ArticleIdentifier): Promise<ArticleParseResult> => {
  const key = articleKey(locale, identifier);
  const existing = articles.get(key);
  if (existing) {
    touch(articles, key, existing, MAX_ARTICLES);
    return existing;
  }

  const promise = fetchArticle(locale, identifier).then((result) => {
    // Alias by the canonical title (and id) so different routes to the same
    // article — a redirect, a prefetch by id — all hit the cache.
    const settled = Promise.resolve(result);
    if (result.title) touch(articles, `${locale}:title:${result.title}`, settled, MAX_ARTICLES);
    if (result.id !== undefined) touch(articles, `${locale}:id:${result.id}`, settled, MAX_ARTICLES);
    return result;
  });

  touch(articles, key, promise, MAX_ARTICLES);
  promise.catch(() => {
    // Don't cache failures.
    if (articles.get(key) === promise) articles.delete(key);
  });
  return promise;
};

/** Backlinks of a goal (used for the hint list and the link count). */
export const loadGoalBacklinks = (locale: Locale, title: string): Promise<GoalBacklinks> => {
  const key = `${locale}:${title}`;
  const existing = backlinks.get(key);
  if (existing) {
    touch(backlinks, key, existing, MAX_BACKLINKS);
    return existing;
  }
  const promise = countReferer(title, locale).then((result) => ({
    numOfRef: Number(result.numOfRef ?? 0),
    hints: Array.isArray(result.hints) ? result.hints.map((hint) => String(hint)) : [],
  }));
  touch(backlinks, key, promise, MAX_BACKLINKS);
  promise.catch(() => {
    if (backlinks.get(key) === promise) backlinks.delete(key);
  });
  return promise;
};

const shouldPrefetch = () => {
  if (typeof window === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData;
};

/**
 * Warm the cache for a hole so the game screen opens instantly. Errors are
 * swallowed — the game page will simply fetch on its own.
 */
export const prefetchHole = (locale: Locale, challenge: Pick<DailyChallenge, "start" | "goal">) => {
  if (!shouldPrefetch()) return;
  const run = () => {
    void loadArticle(locale, { id: challenge.start.id, title: challenge.start.title }).catch(() => {});
    void loadArticle(locale, { id: challenge.goal.id, title: challenge.goal.title }).catch(() => {});
    void loadGoalBacklinks(locale, challenge.goal.title).catch(() => {});
  };
  // Let the page paint first.
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1500 });
  } else {
    window.setTimeout(run, 300);
  }
};
