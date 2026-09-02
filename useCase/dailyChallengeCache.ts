import { type DailyChallenge, type Locale, fetchDailyChallenge, getJstDateString } from "./dailyChallenge";

/**
 * A tiny localStorage cache so repeat visits render today's hole instantly
 * instead of flashing a skeleton. The pre-generated file is the source of
 * truth; this only mirrors today's entry.
 */

const STORAGE_PREFIX = "dailyChallenge";

const buildStorageKey = (locale: Locale) => `${STORAGE_PREFIX}:${locale}`;

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

type CachedDailyChallenge = {
  date: string;
  challenge: DailyChallenge;
};

const isUsable = (cached: CachedDailyChallenge | null | undefined, today: string): cached is CachedDailyChallenge =>
  Boolean(
    cached &&
      cached.date === today &&
      cached.challenge &&
      cached.challenge.date === today &&
      cached.challenge.start?.title &&
      cached.challenge.goal?.title,
  );

export const writeDailyChallengeCache = (locale: Locale, challenge: DailyChallenge) => {
  if (!canUseStorage()) return;
  try {
    const payload: CachedDailyChallenge = { date: challenge.date, challenge };
    window.localStorage.setItem(buildStorageKey(locale), JSON.stringify(payload));
  } catch (error) {
    console.warn("デイリーチャレンジのキャッシュ書き込みに失敗しました", error);
  }
};

export const readCachedDailyChallenge = (locale: Locale): DailyChallenge | null => {
  if (!canUseStorage()) return null;
  const key = buildStorageKey(locale);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedDailyChallenge | null;
    if (!isUsable(cached, getJstDateString())) {
      window.localStorage.removeItem(key);
      return null;
    }
    return cached.challenge;
  } catch (error) {
    console.warn("キャッシュ済みデイリーチャレンジの読み込みに失敗しました", error);
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return null;
  }
};

export const loadDailyChallengeWithCache = async (locale: Locale): Promise<DailyChallenge> => {
  const cached = readCachedDailyChallenge(locale);
  if (cached) return cached;

  const challenge = await fetchDailyChallenge(locale);
  writeDailyChallengeCache(locale, challenge);
  return challenge;
};

/** Drop cache entries from previous days (any locale). */
export const clearExpiredDailyChallengeCache = () => {
  if (!canUseStorage()) return;
  const today = getJstDateString();
  const prefix = `${STORAGE_PREFIX}:`;
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(key);
      let cached: CachedDailyChallenge | null = null;
      try {
        cached = raw ? (JSON.parse(raw) as CachedDailyChallenge) : null;
      } catch {}
      if (!isUsable(cached, today)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn("デイリーチャレンジキャッシュのクリーンアップに失敗しました", error);
  }
};
