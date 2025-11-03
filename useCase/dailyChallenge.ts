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
  year: 1,
  month: 10,
  day: 100,
} as const;

const API_BASE = (locale: "ja" | "en") =>
  `https://${locale}.wikipedia.org/w/api.php`;

const MAX_SEARCH_OFFSET = 500;
const PAGEID_CHUNK_SIZE = 50;

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
  return json?.query?.pages ?? {};
};

const findExistingPage = async (
  locale: "ja" | "en",
  baseId: number,
): Promise<DailyChallengeEntry> => {
  const candidates = buildCandidateIds(baseId);

  for (let index = 0; index < candidates.length; index += PAGEID_CHUNK_SIZE) {
    const chunk = candidates.slice(index, index + PAGEID_CHUNK_SIZE);
    const pages = await fetchPageMetaBatch(locale, chunk);

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

  throw new Error(`Could not resolve a Wikipedia page near id ${baseId}`);
};

const computeDailyBaseId = (date: Date): number => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return (
    year * DAILY_ID_MULTIPLIERS.year +
    month * DAILY_ID_MULTIPLIERS.month +
    day * DAILY_ID_MULTIPLIERS.day
  );
};

export const fetchDailyChallenge = async (
  locale: "ja" | "en" = "ja",
): Promise<DailyChallenge> => {
  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);
  const baseId = computeDailyBaseId(today);

  const goal = await findExistingPage(locale, baseId);
  const start = await findExistingPage(locale, goal.id + 100);

  return {
    locale,
    date: isoDate,
    goal,
    start,
  };
};
