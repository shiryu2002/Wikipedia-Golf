import {
  DailyChallenge,
  fetchDailyChallenge,
  fetchPageParseWithFallback,
} from "./dailyChallenge";

const STORAGE_PREFIX = "dailyChallenge";

const buildStorageKey = (locale: "ja" | "en") => `${STORAGE_PREFIX}:${locale}`;

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

/**
 * Get current date in YYYY-MM-DD format for JST timezone
 */
const getJstDateString = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
};

type CachedDailyChallenge = {
  date: string;
  challenge: DailyChallenge;
};

const writeCachePayload = (locale: "ja" | "en", payload: CachedDailyChallenge) => {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(buildStorageKey(locale), JSON.stringify(payload));
  } catch (error) {
    console.warn("デイリーチャレンジのキャッシュ書き込みに失敗しました", error);
  }
};

export const writeDailyChallengeCache = (
  locale: "ja" | "en",
  challenge: DailyChallenge,
) => {
  const payload: CachedDailyChallenge = {
    date: getJstDateString(),
    challenge,
  };
  writeCachePayload(locale, payload);
};

export const readCachedDailyChallenge = (
  locale: "ja" | "en",
): DailyChallenge | null => {
  if (!canUseStorage()) {
    return null;
  }

  const key = buildStorageKey(locale);
  const today = getJstDateString();

  try {
    const cachedRaw = window.localStorage.getItem(key);
    if (!cachedRaw) {
      return null;
    }
    const cached: CachedDailyChallenge | null = JSON.parse(cachedRaw);
    if (!cached?.challenge) {
      console.warn("キャッシュデータが不正です。削除します。");
      window.localStorage.removeItem(key);
      return null;
    }
    if (cached.date !== today) {
      console.log(`キャッシュが古いです (${cached.date} !== ${today})。削除します。`);
      window.localStorage.removeItem(key);
      return null;
    }
    console.log("キャッシュからデイリーチャレンジを読み込みました");
    return cached.challenge;
  } catch (error) {
    console.warn("キャッシュ済みデイリーチャレンジの読み込みに失敗しました", error);
    // Clear corrupted cache
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return null;
  }
};

export const loadDailyChallengeWithCache = async (
  locale: "ja" | "en",
): Promise<DailyChallenge> => {
  const key = buildStorageKey(locale);
  const today = getJstDateString();

  if (!canUseStorage()) {
    return fetchDailyChallenge(locale);
  }

  let challenge: DailyChallenge | null = null;

  try {
    const cachedRaw = window.localStorage.getItem(key);
    if (cachedRaw) {
      const cached: CachedDailyChallenge | null = JSON.parse(cachedRaw);
      if (cached?.date === today && cached.challenge) {
        console.log("ローカルストレージからデイリーチャレンジを復元しました");
        challenge = cached.challenge;
      } else {
        window.localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn("キャッシュ済みデイリーチャレンジの読み込みに失敗しました", error);
    // Clear corrupted cache
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }

  if (!challenge) {
    try {
      challenge = await fetchDailyChallenge(locale);
      const payload: CachedDailyChallenge = { date: today, challenge };
      writeCachePayload(locale, payload);
    } catch (error) {
      console.error("デイリーチャレンジの取得に失敗しました", error);
      throw error;
    }
  }

  if (!challenge) {
    throw new Error("デイリーチャレンジを解決できませんでした");
  }

  // Skip verification if the challenge was loaded from pre-generated JSON
  // to avoid unnecessary API calls and improve loading speed
  if (challenge.fromJson) {
    return challenge;
  }

  // Verify goal article for API-generated challenges
  try {
    const goalParse = await fetchPageParseWithFallback(locale, {
      id: challenge.goal.id,
      title: challenge.goal.title,
    });
    const resolvedGoalId = goalParse.id ?? challenge.goal.id;
    const resolvedGoalTitle = goalParse.title ?? challenge.goal.title;

    if (
      resolvedGoalId !== challenge.goal.id
      || resolvedGoalTitle !== challenge.goal.title
    ) {
      console.log(`ゴール記事を更新: ${challenge.goal.title} → ${resolvedGoalTitle}`);
      const updated: DailyChallenge = {
        ...challenge,
        goal: {
          id: resolvedGoalId,
          title: resolvedGoalTitle,
        },
        // Preserve fromJson flag if it exists
        fromJson: challenge.fromJson,
      };
      const payload: CachedDailyChallenge = { date: today, challenge: updated };
      writeCachePayload(locale, payload);
      return updated;
    }
  } catch (error) {
    console.warn("ゴール記事の検証に失敗しました", error);
  }

  return challenge;
};

export const clearExpiredDailyChallengeCache = () => {
  if (!canUseStorage()) return;

  const today = getJstDateString();
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
