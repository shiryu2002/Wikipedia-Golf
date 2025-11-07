import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/router";

import { HintsModal } from "@/components/Hints";
import { ShareModal } from "@/components/Share";
import { MobileHintsModal } from "@/components/mobile/MobileHintsModal";
import { MobileHistoryModal } from "@/components/mobile/MobileHistoryModal";
import { Confetti } from "@/components/Confetti";
import Image from "next/image";
import { DailyChallenge } from "@/useCase/dailyChallenge";
import {
  clearExpiredDailyChallengeCache,
  loadDailyChallengeWithCache,
  readCachedDailyChallenge,
} from "@/useCase/dailyChallengeCache";
import countReferer from "@/useCase/referer";
import CircularProgress from "@mui/material/CircularProgress";
import { formatTime } from "@/utils/time";

const isDailyGameMode = (mode: string): boolean => {
  return mode === "daily" || mode === "daily-ta";
};

type StartMode = "random" | "daily" | "daily-ta" | "custom";

type StartOptions = {
  startTitle?: string;
  goalTitle?: string;
  locale?: "en" | "ja";
};

type GoalDetailsCacheEntry = {
  html: string;
  numOfRef: number;
  hints: string[];
};

export default function GamePage() {
  const router = useRouter();
  const autoStartRef = useRef(false);
  const [title, setTitle] = useState<string>("");
  const [locale, setLocale] = useState<"en" | "ja">("ja");
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<
    { title: string; url: string; stroke: number }[]
  >([]);
  const [stroke, setStroke] = useState<number>(-1);
  const [goal, setGoal] = useState<string>("");
  const [goalArticle, setGoalArticle] = useState("");
  const [isGoalDetailsView, setIsGoalDetailsView] = useState(false);
  const [isGoalLoading, setIsGoalLoading] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">(
    "idle"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [numOfReferer, setNumOfReferer] = useState<number>(0);
  const [hints, setHints] = useState<string[]>([]);
  const [isHintModalOpen, setHintModal] = useState(false);
  const [isDailyMode, setIsDailyMode] = useState(false);
  const [isTimeAttackMode, setIsTimeAttackMode] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isDailyStartup, setIsDailyStartup] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const ignoreNextContentRef = useRef(false);
  const goalDetailsCacheRef = useRef(new Map<string, GoalDetailsCacheEntry>());
  const articleCacheRef = useRef(new Map<string, string>());

  const handleReturnToTitle = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const confirmed = window.confirm("タイトル画面に戻りますか？");
    if (confirmed) {
      void router.push("/");
    }
  }, [router]);

  const handleLinkClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
    if (isGoalDetailsView) {
      return;
    }

    const anchor = event.currentTarget as HTMLAnchorElement | null;
    const title = anchor?.getAttribute("title");
    if (title) {
      setTitle(title);
    }
  }, [isGoalDetailsView]);

  const pickStart = async (): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://${locale}.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`
      );
      const data = await response.json();
      const randomTitle = data.query.random[0].title;
      setTitle(randomTitle);
      setGameState("playing");
      return randomTitle;
    } catch (error) {
      console.error("スタートページの取得に失敗しました", error);
      return null;
    }
  };

  const populateGoalDetails = async (options: {
    title: string;
    pageId?: number;
    localeOverride?: "en" | "ja";
  }) => {
    const activeLocale = options.localeOverride ?? locale;
    setGoal(options.title);
    const cacheKey = options.pageId !== undefined
      ? `${activeLocale}:goal:id:${options.pageId}`
      : `${activeLocale}:goal:title:${options.title}`;

    const cached = goalDetailsCacheRef.current.get(cacheKey);
    if (cached) {
      setNumOfReferer(cached.numOfRef);
      setHints(cached.hints);
      setGoalArticle(cached.html);
      return;
    }

    const goalUrl = options.pageId !== undefined
      ? `https://${activeLocale}.wikipedia.org/w/api.php?action=parse&pageid=${options.pageId}&format=json&origin=*`
      : `https://${activeLocale}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(options.title)}&format=json&origin=*`;

    try {
      const [refResult, parseResult] = await Promise.all([
        countReferer(options.title, activeLocale),
        fetch(goalUrl).then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch goal article for ${options.title}`);
          }
          return response.json();
        }),
      ]);

      const goalHtml: string = parseResult.parse?.text?.["*"] ?? "";
      const resolvedPageId: number | undefined = options.pageId ?? parseResult.parse?.pageid;
      const normalizedHints: string[] = Array.isArray(refResult.hints)
        ? refResult.hints.map((hint: any) => String(hint))
        : [];

      const entry: GoalDetailsCacheEntry = {
        html: goalHtml,
        numOfRef: Number(refResult.numOfRef ?? 0),
        hints: normalizedHints,
      };

      goalDetailsCacheRef.current.set(cacheKey, entry);
      goalDetailsCacheRef.current.set(`${activeLocale}:goal:title:${options.title}`, entry);
      if (resolvedPageId !== undefined) {
        goalDetailsCacheRef.current.set(`${activeLocale}:goal:id:${resolvedPageId}`, entry);
      }

      setNumOfReferer(entry.numOfRef);
      setHints(entry.hints);
      setGoalArticle(entry.html);
    } catch (error) {
      console.error("ゴールページの取得に失敗しました", error);
    }
  };

  const getGoal = async (): Promise<string | null> => {
    setIsDailyMode(false);
    setIsGoalLoading(true);
    try {
      const response = await fetch(
        `https://${locale}.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`
      );
      const data = await response.json();
      const randomTitle = data.query.random[0].title;
      await populateGoalDetails({ title: randomTitle });
      return randomTitle;
    } catch (error) {
      console.error("ゴールページの取得に失敗しました", error);
      return null;
    } finally {
      setIsGoalLoading(false);
    }
  };

  const resolveDailyChallenge = async (): Promise<DailyChallenge | null> => {
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      if (
        dailyChallenge &&
        dailyChallenge.locale === locale &&
        dailyChallenge.date === todayIso
      ) {
        return dailyChallenge;
      }

      const challenge = await loadDailyChallengeWithCache(locale);
      setDailyChallenge(challenge);
      return challenge;
    } catch (error) {
      console.error("今日のお題の取得に失敗しました", error);
      return null;
    }
  };

  const checkIfGameOver = (title: string) => {
    if (title === goal) {
      setGameState("gameover");
      // Stop timer when goal is reached
      if (isTimeAttackMode && startTime !== null) {
        setElapsedTime(performance.now() - startTime);
      }
    }
  };

  useEffect(() => {
    if (!title) return;
    fetchTitle(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Timer update effect
  useEffect(() => {
    if (!isTimeAttackMode || gameState !== "playing" || startTime === null) {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedTime(performance.now() - startTime);
    }, 1000); // Update every 1 second

    return () => clearInterval(intervalId);
  }, [isTimeAttackMode, gameState, startTime]);

  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>("#articleContent a");

    links.forEach((link) => {
      link.addEventListener("click", handleLinkClick as EventListener);

      if (isGoalDetailsView) {
        if (link.dataset.goalViewDisabled !== "true") {
          const currentTabIndex = link.getAttribute("tabindex");
          if (currentTabIndex !== null) {
            link.dataset.goalPrevTabindex = currentTabIndex;
          }
        }
        link.dataset.goalViewDisabled = "true";
        link.setAttribute("aria-disabled", "true");
        link.setAttribute("tabindex", "-1");
      } else if (link.dataset.goalViewDisabled === "true") {
        link.removeAttribute("aria-disabled");
        const previousTabIndex = link.dataset.goalPrevTabindex;
        if (previousTabIndex !== undefined) {
          link.setAttribute("tabindex", previousTabIndex);
        } else {
          link.removeAttribute("tabindex");
        }
        delete link.dataset.goalPrevTabindex;
        delete link.dataset.goalViewDisabled;
      }
    });

    return () => {
      links.forEach((link) => {
        link.removeEventListener("click", handleLinkClick as EventListener);
        if (link.dataset.goalViewDisabled === "true") {
          link.removeAttribute("aria-disabled");
          const previousTabIndex = link.dataset.goalPrevTabindex;
          if (previousTabIndex !== undefined) {
            link.setAttribute("tabindex", previousTabIndex);
          } else {
            link.removeAttribute("tabindex");
          }
          delete link.dataset.goalPrevTabindex;
          delete link.dataset.goalViewDisabled;
        }
      });
    };
  }, [content, goalArticle, handleLinkClick, isGoalDetailsView]);

  const applyArticleContent = (
    articleTitle: string,
    html: string,
    shouldSkipProgressUpdate: boolean,
    requestUrl: string,
  ) => {
    setContent(html);

    if (
      !shouldSkipProgressUpdate &&
      articleTitle !== "メインページ" &&
      gameState === "playing"
    ) {
      setStroke((prevStroke) => {
        const nextStroke = prevStroke + 1;
        setHistory((prev) => [
          ...prev,
          { title: articleTitle, url: requestUrl, stroke: nextStroke },
        ]);
        return nextStroke;
      });
    }

    checkIfGameOver(articleTitle);
  };

  const finalizeArticleLoad = (shouldSkipProgressUpdate: boolean) => {
    window.scrollTo(0, 0);
    if (!shouldSkipProgressUpdate) {
      setIsDailyStartup(false);
    }
    ignoreNextContentRef.current = false;
  };

  const fetchTitle = async (title: string) => {
    const encodedTitle = encodeURIComponent(title);
    const requestUrl = `https://${locale}.wikipedia.org/w/api.php?action=parse&page=${encodedTitle}&format=json&origin=*`;
    const cacheKey = `${locale}:${title}`;
    const shouldSkipProgressUpdate = ignoreNextContentRef.current;

    const cachedHtml = articleCacheRef.current.get(cacheKey);
    if (cachedHtml !== undefined) {
      setIsLoading(false);
      applyArticleContent(title, cachedHtml, shouldSkipProgressUpdate, requestUrl);
      finalizeArticleLoad(shouldSkipProgressUpdate);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(requestUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${title}`);
      }
      const data = await response.json();
      const html = data.parse?.text?.["*"] ?? "";

      articleCacheRef.current.set(cacheKey, html);
      applyArticleContent(title, html, shouldSkipProgressUpdate, requestUrl);
    } catch (error) {
      console.error("記事の取得に失敗しました", error);
      setIsDailyStartup(false);
    } finally {
      setIsLoading(false);
      finalizeArticleLoad(shouldSkipProgressUpdate);
    }
  };


  const handleBackClick = () => {
    if (history.length <= 1) return;

    const updatedHistory = history.slice(0, -1);
    const previous = updatedHistory[updatedHistory.length - 1];
    if (!previous) return;

    ignoreNextContentRef.current = true;
    setHistory(updatedHistory);
    setStroke(previous.stroke);
    setGameState("playing");
    setTitle(previous.title);
  };

  const start = async (mode: StartMode = "random", options?: StartOptions) => {
    if (stroke > 0) {
      const shouldRestart = window.confirm("別のお題でやり直しますか？");
      if (!shouldRestart) return;
    }
    setHistoryModalOpen(false);
    setGameState("idle");
    setHintModal(false);
    setStroke(-1);
    setHistory([]);
    setGoal("");
    setGoalArticle("");
    setIsGoalDetailsView(false);
    setIsDailyStartup(isDailyGameMode(mode));
    
    // Reset timer state
    setIsTimeAttackMode(mode === "daily-ta");
    setStartTime(null);
    setElapsedTime(0);

    if (isDailyGameMode(mode)) {
      ignoreNextContentRef.current = true;
      setContent("");
      const challenge = await resolveDailyChallenge();
      ignoreNextContentRef.current = false;

      if (challenge?.start?.title) {
        setDailyChallenge(challenge);
        setIsDailyMode(true);
        setGameState("playing");
        setTitle(challenge.start.title);
        
        // Start timer for time attack mode
        if (mode === "daily-ta") {
          setStartTime(performance.now());
        }

        void (async () => {
          setIsGoalLoading(true);
          try {
            await populateGoalDetails({
              title: challenge.goal.title,
              pageId: challenge.goal.id,
            });
          } catch (error) {
            console.error("ゴールページの取得に失敗しました", error);
          } finally {
            setIsGoalLoading(false);
          }
        })();

        return;
      }

      setIsDailyMode(false);
      setIsDailyStartup(false);
      console.warn(
        "Daily challenge start article could not be resolved. Falling back to random start."
      );
    }

    const hasExplicitArticles = Boolean(options?.startTitle && options?.goalTitle);

    if ((mode === "custom" || (mode === "random" && hasExplicitArticles)) && options) {
      const targetLocale = options.locale ?? locale;
      if (targetLocale !== locale) {
        setLocale(targetLocale);
      }

      if (!options.startTitle || !options.goalTitle) {
        console.warn("カスタムお題の指定が不足しています。ランダムお題を開始します。");
      } else {
        setIsDailyMode(false);
        setIsDailyStartup(false);
        setGameState("playing");
        setTitle(options.startTitle);
        setIsGoalLoading(true);
        try {
          await populateGoalDetails({
            title: options.goalTitle,
            localeOverride: targetLocale,
          });
        } catch (error) {
          console.error("カスタムゴールの取得に失敗しました", error);
        } finally {
          setIsGoalLoading(false);
        }

        if (mode === "random") {
          autoStartRef.current = true;
          void router.replace({
            pathname: router.pathname,
            query: {
              start: "random",
              startTitle: options.startTitle,
              goalTitle: options.goalTitle,
              locale: targetLocale,
            },
          }, undefined, { shallow: true });
        }
        return;
      }
    }

    setIsDailyMode(false);
    setIsDailyStartup(false);
    const [randomStartTitle, randomGoalTitle] = await Promise.all([
      pickStart(),
      getGoal(),
    ]);

    if (randomStartTitle && randomGoalTitle) {
      autoStartRef.current = true;
      void router.replace({
        pathname: router.pathname,
        query: {
          start: "random",
          startTitle: randomStartTitle,
          goalTitle: randomGoalTitle,
          locale,
        },
      }, undefined, { shallow: true });
    }
  };

  const decodeQueryParam = (value: string | string[] | undefined) => {
    if (value === undefined) return undefined;
    const resolved = Array.isArray(value) ? value[0] : value;
    if (resolved === undefined) return undefined;
    try {
      return decodeURIComponent(resolved.replace(/\+/g, "%20"));
    } catch {
      return resolved;
    }
  };

  useEffect(() => {
    clearExpiredDailyChallengeCache();
    const cached = readCachedDailyChallenge(locale);
    if (cached) {
      setDailyChallenge(cached);
    }
  }, [locale]);

  useEffect(() => {
    let isCancelled = false;
    const loadChallenge = async () => {
      try {
        const challenge = await loadDailyChallengeWithCache(locale);
        if (!isCancelled) {
          setDailyChallenge(challenge);
        }
      } catch (error) {
        console.error("デイリーチャレンジの取得に失敗しました", error);
        if (!isCancelled) {
          setDailyChallenge(null);
        }
      }
    };

    loadChallenge();

    return () => {
      isCancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (!router.isReady || autoStartRef.current) {
      return;
    }
    const startParam = decodeQueryParam(router.query.start);
    const startTitleParam = decodeQueryParam(router.query.startTitle);
    const goalTitleParam = decodeQueryParam(router.query.goalTitle);
    const localeParam = decodeQueryParam(router.query.locale);

    let resolvedMode: StartMode | null = null;
    let startOptions: StartOptions | undefined;

    if (startParam === "daily") {
      resolvedMode = "daily";
    } else if (startParam === "daily-ta") {
      resolvedMode = "daily-ta";
    } else if (startParam === "random" && startTitleParam && goalTitleParam) {
      resolvedMode = "random";
      startOptions = {
        startTitle: startTitleParam,
        goalTitle: goalTitleParam,
        locale: localeParam === "en" ? "en" : localeParam === "ja" ? "ja" : undefined,
      };
    } else if (startParam === "random") {
      resolvedMode = "random";
    } else if (startParam === "custom" || (startTitleParam && goalTitleParam)) {
      resolvedMode = "custom";
      startOptions = {
        startTitle: startTitleParam ?? undefined,
        goalTitle: goalTitleParam ?? undefined,
        locale: localeParam === "en" ? "en" : localeParam === "ja" ? "ja" : undefined,
      };
      if (!startOptions.startTitle || !startOptions.goalTitle) {
        resolvedMode = null;
        startOptions = undefined;
      }
    }

    if (resolvedMode) {
      autoStartRef.current = true;
      void start(resolvedMode, startOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.start, router.query.startTitle, router.query.goalTitle, router.query.locale]);

  const activeArticleHtml = isGoalDetailsView ? goalArticle : content;
  const isPrimaryArticleLoading = isGoalDetailsView ? isGoalLoading : isLoading;
  const todayIso = new Date().toISOString().slice(0, 10);
  const dailyGoalTitle = dailyChallenge?.goal.title ?? "読み込み中";
  const dailyGoalDate = dailyChallenge?.date ?? todayIso;
  const isDailyRunActive = isDailyMode && gameState === "playing";
  const shouldShowDailyStartup = isDailyStartup && !isGoalDetailsView;
  const startArticleTitle = history.length > 0
    ? history[0].title
    : title || dailyChallenge?.start.title || "未設定";
  const headerGoalTitle = goal || dailyChallenge?.goal.title || "未設定";
  const canToggleGoal = Boolean(goal);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6 sm:px-6">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleReturnToTitle}
              className="hidden items-center gap-4 rounded-2xl bg-transparent p-0 text-left text-white transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:flex sm:gap-5"
            >
              <Image
                src="/w2.png"
                alt="Wikipedia Golf アイコン"
                width={64}
                height={64}
                className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16"
                priority
              />
              <h1 className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
                Wikipedia Golf
              </h1>
            </button>
            <div className="flex w-full flex-col gap-3 sm:flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start sm:gap-4">
                <div className="flex w-full max-w-full gap-4 pr-4 sm:hidden">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                      スタート
                    </p>
                    <p className="truncate text-sm font-semibold text-white">
                      {startArticleTitle}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                      ゴール
                    </p>
                    <p className="truncate text-sm font-semibold text-white">
                      {headerGoalTitle}
                    </p>
                  </div>
                </div>
                <div className="flex w-full justify-end gap-4 sm:w-auto sm:justify-start sm:ml-auto">
                  <p className="text-lg tracking-[0.25em] text-slate-300 sm:text-xl md:text-2xl">
                    打数:
                    <span className="ml-2 text-3xl font-semibold text-white sm:text-4xl">
                      {stroke === -1 ? "0" : stroke}
                    </span>
                  </p>
                  {isTimeAttackMode && (
                    <p className="text-lg tracking-[0.25em] text-slate-300 sm:text-xl md:text-2xl">
                      タイム:
                      <span className="ml-2 text-3xl font-semibold text-white sm:text-4xl">
                        {formatTime(elapsedTime)}s
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-row flex-wrap gap-2 sm:w-auto sm:gap-3 sm:justify-end">
                <button
                  className="flex-1 min-w-[140px] rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400 sm:flex-none sm:w-auto"
                  onClick={() => start("random")}
                >
                  ランダムでスタート
                </button>
                {!isDailyRunActive && (
                  <button
                    className="flex-1 min-w-[140px] rounded-full border border-blue-300/60 px-5 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200 hover:text-white sm:flex-none sm:w-auto"
                    onClick={() => start("daily")}
                  >
                    今日のお題に挑戦
                  </button>
                )}
                {gameState === "playing" && (
                  <button
                    className="flex-1 min-w-[140px] rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:flex-none sm:w-auto"
                    onClick={() => setHintModal(!isHintModalOpen)}
                  >
                    ヒントを見る
                  </button>
                )}
                <button
                  className="flex-1 min-w-[140px] rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:hidden"
                  onClick={() => setHistoryModalOpen(true)}
                  type="button"
                >
                  ルート
                </button>
                <button
                  className={`flex-1 min-w-[140px] rounded-full px-5 py-3 text-sm font-semibold transition sm:hidden ${canToggleGoal
                    ? "border border-white/20 text-white hover:bg-white/10"
                    : "cursor-not-allowed border border-white/10 text-slate-500"}`}
                  onClick={() => {
                    if (!canToggleGoal) return;
                    setIsGoalDetailsView((prev) => !prev);
                  }}
                  disabled={!canToggleGoal}
                  type="button"
                >
                  {canToggleGoal
                    ? isGoalDetailsView
                      ? "現在の記事に戻る"
                      : "ゴール記事を表示"
                    : "ゴールは未設定"}
                </button>
              </div>
            </div>
          </div>
          <ShareModal
            gameState={gameState}
            stroke={stroke}
            history={history}
            goal={goal}
            isDailyMode={isDailyMode}
            isTimeAttackMode={isTimeAttackMode}
            elapsedTime={elapsedTime}
            locale={locale}
          />
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:flex-row">
        <aside className="hidden md:flex w-full flex-col gap-6 lg:w-80 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <section className="hidden rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-slate-900 p-6 text-white shadow-2xl sm:block">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">
              今日のお題
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight">
              {dailyGoalTitle}
            </h2>
            <p className="mt-1 text-sm text-white/80">日付: {dailyGoalDate}</p>
            <div className="mt-4 flex flex-col gap-3">
              {!isDailyRunActive && (
                <button
                  className="w-full rounded-full bg-white py-3 text-center font-semibold text-slate-900 shadow transition hover:bg-slate-100"
                  onClick={() => start("daily")}
                >
                  このお題でスタート
                </button>
              )}
              <button
                className={`w-full rounded-full border border-white/40 py-3 text-center text-white transition ${goal ? "hover:bg-white/10" : "cursor-not-allowed opacity-40"
                  }`}
                onClick={() => {
                  if (!goal) return;
                  setIsGoalDetailsView((prev) => !prev);
                }}
                disabled={!goal}
              >
                {goal
                  ? isGoalDetailsView
                    ? "現在の記事に戻る"
                    : "ゴール記事を表示"
                  : "ゴールは未設定"}
              </button>
            </div>
          </section>

          {goal && (
            <section className="hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur sm:block">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => {
                  if (!goal) return;
                  setIsGoalDetailsView((prev) => !prev);
                }}
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    ゴール記事
                  </p>
                  <p className="mt-1 text-xl font-semibold">{goal}</p>
                </div>
                <span className="text-sm text-blue-200">{numOfReferer} リンク</span>
              </button>
            </section>
          )}

          <section className="hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur sm:block">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">辿ったルート</h2>
              <button
                className={`text-xs transition ${history.length <= 1 || isTimeAttackMode
                  ? "cursor-not-allowed text-slate-500"
                  : "text-blue-200 hover:text-blue-100"
                  }`}
                onClick={handleBackClick}
                disabled={history.length <= 1 || isTimeAttackMode}
              >
                1手戻す
              </button>
            </div>
            <div className="mt-4 space-y-3 pr-2 lg:max-h-[50vh] lg:overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-slate-300">
                  まだ遷移履歴がありません。
                </p>
              ) : (
                history.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-100 shadow-sm"
                  >
                    <p className="text-xs uppercase tracking-wider text-blue-200">
                      {item.stroke === 0 ? "スタート" : `${item.stroke} 打目`}
                    </p>
                    <p className="mt-1 text-base font-semibold">{item.title}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="hidden sm:block">
            <HintsModal hints={hints} isOpen={isHintModalOpen} />
          </div>
        </aside>

        <section className="flex-1 min-w-0">
          <div className="min-w-0 rounded-3xl border border-white/10 bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {isGoalDetailsView ? "ゴール記事" : "現在の記事"}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  {isGoalDetailsView ? goal || "ゴール未設定" : title || "読み込み中･･･"}
                </h1>
                {isGoalDetailsView && isDailyMode && (
                  <p className="mt-1 text-xs text-slate-500">
                    今日のお題モードで選定されたゴールです。
                  </p>
                )}
              </div>
              {isGoalDetailsView && (
                <button
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  onClick={() => setIsGoalDetailsView(false)}
                >
                  現在の記事に戻る
                </button>
              )}
            </div>
            {shouldShowDailyStartup ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-slate-600 sm:min-h-[70vh]">
                <CircularProgress />
                <p className="text-sm font-medium tracking-wide">
                  今日のお題を取得中…
                </p>
              </div>
            ) : isPrimaryArticleLoading ? (
              <div className="flex min-h-[60vh] items-center justify-center sm:min-h-[70vh]">
                <CircularProgress />
              </div>
            ) : activeArticleHtml ? (
              <div
                id="articleContent"
                className="article-content max-w-full text-slate-900"
                dangerouslySetInnerHTML={{ __html: activeArticleHtml }}
              />
            ) : gameState === "idle" ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-sm text-slate-500 sm:min-h-[70vh]">
                <p>ゲームを開始すると、記事がここに表示されます。</p>
                <p className="mt-1">お題を選んでプレイを始めてください。</p>
              </div>
            ) : (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-sm text-slate-500 sm:min-h-[70vh]">
                <p>記事を読み込めませんでした。</p>
                <p className="mt-1">別のリンクを開くか、再度お試しください。</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <MobileHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onBack={handleBackClick}
        history={history}
        isTimeAttackMode={isTimeAttackMode}
      />
      <MobileHintsModal
        isOpen={isHintModalOpen}
        onClose={() => setHintModal(false)}
        hints={hints}
      />
      <Confetti active={gameState === "gameover"} />
    </div>
  );
}
