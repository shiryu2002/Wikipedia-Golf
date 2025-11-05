import { DailyChallenge, fetchDailyChallenge } from "./dailyChallenge";

const STORAGE_PREFIX = "dailyChallenge";

const buildStorageKey = (locale: "ja" | "en") => `${STORAGE_PREFIX}:${locale}`;

const getJapanTodayIsoDate = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
};

type CachedDailyChallenge = {
  date: string;
  challenge: DailyChallenge;
};

export const readCachedDailyChallenge = (
  locale: "ja" | "en",
): DailyChallenge | null => {
  const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  if (!isBrowser) {
    return null;
  }

  const key = buildStorageKey(locale);
  const today = getJapanTodayIsoDate();

  try {
    const cachedRaw = window.localStorage.getItem(key);
    if (!cachedRaw) {
      return null;
    }
    const cached: CachedDailyChallenge | null = JSON.parse(cachedRaw);
    if (!cached?.challenge) {
      window.localStorage.removeItem(key);
      return null;
    }
    if (cached.date !== today) {
      window.localStorage.removeItem(key);
      return null;
    }
    return cached.challenge;
  } catch (error) {
    console.warn("キャッシュ済みデイリーチャレンジの読み込みに失敗しました", error);
    return null;
  }
};

export const loadDailyChallengeWithCache = async (
  locale: "ja" | "en",
): Promise<DailyChallenge> => {
  const key = buildStorageKey(locale);
  const today = getJapanTodayIsoDate();
  const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  if (!isBrowser) {
    return fetchDailyChallenge(locale);
  }

  try {
    const cachedRaw = window.localStorage.getItem(key);
    if (cachedRaw) {
      const cached: CachedDailyChallenge | null = JSON.parse(cachedRaw);
      if (cached?.date === today && cached.challenge) {
        return cached.challenge;
      }
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn("キャッシュ済みデイリーチャレンジの読み込みに失敗しました", error);
  }

  try {
    const challenge = await fetchDailyChallenge(locale);
    const payload: CachedDailyChallenge = { date: today, challenge };
    window.localStorage.setItem(key, JSON.stringify(payload));
    return challenge;
  } catch (error) {
    console.error("デイリーチャレンジの取得に失敗しました", error);
    throw error;
  }
};

export const clearExpiredDailyChallengeCache = () => {
  const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  if (!isBrowser) return;

  const today = getJapanTodayIsoDate();
  const prefix = `${STORAGE_PREFIX}:`;

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(prefix)) {
        continue;
      }
      const rawValue = window.localStorage.getItem(key);
      if (!rawValue) {
        continue;
      }
      const cached: CachedDailyChallenge | null = JSON.parse(rawValue);
      if (!cached || cached.date !== today) {
        window.localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn("デイリーチャレンジキャッシュのクリーンアップに失敗しました", error);
  }
};
