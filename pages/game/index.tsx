import { useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import { ShareModal } from "@/components/Share";
import { ArticleView } from "@/components/game/ArticleView";
import { DailyCard } from "@/components/game/DailyCard";
import { GoalCard } from "@/components/game/GoalCard";
import { HoleInCelebration } from "@/components/game/HoleInCelebration";
import { HintsPanel } from "@/components/game/HintsPanel";
import { MobileDock, type DockSheet } from "@/components/game/MobileDock";
import { RouteTimeline } from "@/components/game/RouteTimeline";
import { Scorecard, type GameMode } from "@/components/game/Scorecard";
import { TopBar } from "@/components/game/TopBar";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  DiceIcon,
  EyeIcon,
  FlagIcon,
  HomeIcon,
  LinkIcon,
  TrophyIcon,
} from "@/components/ui/Icons";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { formatTime } from "@/utils/time";
import { loadArticle, loadGoalBacklinks } from "@/useCase/articleCache";
import { type DailyChallenge } from "@/useCase/dailyChallenge";
import {
  clearExpiredDailyChallengeCache,
  loadDailyChallengeWithCache,
  readCachedDailyChallenge,
  writeDailyChallengeCache,
} from "@/useCase/dailyChallengeCache";

const isDailyGameMode = (mode: string): boolean => {
  return mode === "daily" || mode === "daily-ta";
};

type StartMode = "random" | "daily" | "daily-ta" | "custom";

type StartOptions = {
  startTitle?: string;
  goalTitle?: string;
  locale?: "en" | "ja";
};

export default function GamePage() {
  const router = useRouter();
  const autoStartRef = useRef(false);
  const [title, setTitle] = useState<string>("");
  /** Canonical title of the loaded article (after redirects / normalisation). */
  const [displayTitle, setDisplayTitle] = useState<string>("");
  const [articleId, setArticleId] = useState<number | undefined>(undefined);
  const [locale, setLocale] = useState<"en" | "ja">("ja");
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<{ title: string; url: string; stroke: number }[]>([]);
  const [stroke, setStroke] = useState<number>(-1);
  const [goal, setGoal] = useState<string>("");
  const [goalArticle, setGoalArticle] = useState("");
  const [isGoalDetailsView, setIsGoalDetailsView] = useState(false);
  const [isGoalLoading, setIsGoalLoading] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [numOfReferer, setNumOfReferer] = useState<number>(0);
  const [hints, setHints] = useState<string[]>([]);
  const [isHintModalOpen, setHintModal] = useState(false);
  const [isDailyMode, setIsDailyMode] = useState(false);
  const [isTimeAttackMode, setIsTimeAttackMode] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isDailyStartup, setIsDailyStartup] = useState(false);
  const [isHintEnabled, setIsHintEnabled] = useState(false);
  const [activeMode, setActiveMode] = useState<StartMode | null>(null);
  const [activeSheet, setActiveSheet] = useState<DockSheet | null>(null);
  const [isResultDismissed, setIsResultDismissed] = useState(false);
  /** The hole-in animation plays between reaching the goal and the result dialog. */
  const [isCelebrating, setIsCelebrating] = useState(false);
  const ignoreNextContentRef = useRef(false);
  const gameStateRef = useRef(gameState);
  const leavingRef = useRef(false);
  gameStateRef.current = gameState;

  const { confirm, confirmDialog } = useConfirm();
  const { copied: isUrlCopied, copy: copyUrl } = useCopyToClipboard();

  // Guard the browser back button while a run is in progress.
  useEffect(() => {
    router.beforePopState(() => {
      if (leavingRef.current || gameStateRef.current !== "playing") {
        return true;
      }
      window.history.pushState(null, "", router.asPath);
      void confirm({
        title: "タイトルに戻りますか？",
        description: "進行中のゲームは中断され、記録は保存されません。",
        confirmLabel: "タイトルに戻る",
        cancelLabel: "続ける",
        tone: "danger",
      }).then((confirmed) => {
        if (confirmed) {
          leavingRef.current = true;
          void router.push("/");
        }
      });
      return false;
    });

    return () => {
      router.beforePopState(() => true);
    };
  }, [router, confirm]);

  const handleReturnToTitle = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    if (gameStateRef.current === "playing") {
      const confirmed = await confirm({
        title: "タイトル画面に戻りますか？",
        description: "進行中のゲームは中断されます。",
        confirmLabel: "タイトルに戻る",
        cancelLabel: "続ける",
        tone: "danger",
      });
      if (!confirmed) return;
    }
    leavingRef.current = true;
    void router.push("/");
  }, [router, confirm]);

  const handleCopyCustomUrl = useCallback(async () => {
    if (!goal || isDailyMode) return;

    const startTitle = history.length > 0 ? history[0]?.title : title;
    if (!startTitle) return;

    const siteOrigin =
      typeof window !== "undefined" ? window.location.origin : "https://wikipedia-golf.vercel.app";
    const params = new URLSearchParams({
      start: "custom",
      startTitle,
      goalTitle: goal,
    });
    if (locale) {
      params.set("locale", locale);
    }
    if (isHintEnabled) {
      params.set("hint", "1");
    }
    await copyUrl(`${siteOrigin}/game?${params.toString()}`);
  }, [goal, history, isDailyMode, locale, title, isHintEnabled, copyUrl]);

  const handleLinkClick = useCallback(
    (event: MouseEvent) => {
      const anchor = event.currentTarget as HTMLAnchorElement | null;
      const href = anchor?.getAttribute("href");

      // Allow anchor links (TOC navigation) to work normally without counting as a move
      if (href && href.startsWith("#")) {
        return;
      }

      event.preventDefault();
      if (isGoalDetailsView) {
        return;
      }

      const title = anchor?.getAttribute("title");
      if (title) {
        setArticleId(undefined);
        setTitle(title);
      }
    },
    [isGoalDetailsView],
  );

  const pickStart = async (): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://${locale}.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`,
      );
      const data = await response.json();
      const randomTitle = data.query.random[0].title;
      setArticleId(undefined);
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

    try {
      // Both hit the module cache, which the home page may have warmed.
      const goalArticle = await loadArticle(activeLocale, { id: options.pageId, title: options.title });
      const refs = await loadGoalBacklinks(activeLocale, goalArticle.title);

      setGoal(goalArticle.title);
      setNumOfReferer(refs.numOfRef);
      setHints(refs.hints);
      setGoalArticle(goalArticle.html);

      const resolvedGoalId = goalArticle.id ?? options.pageId;
      if (options.pageId !== undefined) {
        setDailyChallenge((prev) => {
          if (!prev || prev.locale !== activeLocale) {
            return prev;
          }
          const resolvedId = resolvedGoalId ?? prev.goal.id;
          if (resolvedId === prev.goal.id && goalArticle.title === prev.goal.title) {
            return prev;
          }
          const updated: DailyChallenge = {
            ...prev,
            goal: {
              id: resolvedId,
              title: goalArticle.title,
            },
          };
          writeDailyChallengeCache(activeLocale, updated);
          return updated;
        });
      }
    } catch (error) {
      console.error("ゴールページの取得に失敗しました", error);
    }
  };

  const getGoal = async (): Promise<string | null> => {
    setIsDailyMode(false);
    setIsGoalLoading(true);
    try {
      const response = await fetch(
        `https://${locale}.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`,
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
      if (dailyChallenge && dailyChallenge.locale === locale && dailyChallenge.date === todayIso) {
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
      setIsResultDismissed(false);
      setIsCelebrating(true);
      setActiveSheet(null);
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
    }, 100);

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
  }, [content, goalArticle, title, handleLinkClick, isGoalDetailsView]);

  const applyArticleContent = (
    articleTitle: string,
    html: string,
    shouldSkipProgressUpdate: boolean,
    requestUrl: string,
  ) => {
    setContent(html);
    setDisplayTitle(articleTitle);

    if (!shouldSkipProgressUpdate && articleTitle !== "メインページ" && gameState === "playing") {
      setStroke((prevStroke) => {
        const nextStroke = prevStroke + 1;
        setHistory((prev) => [...prev, { title: articleTitle, url: requestUrl, stroke: nextStroke }]);
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

  const fetchTitle = async (requestedTitle: string) => {
    const articleUrl = `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(requestedTitle)}`;
    const shouldSkipProgressUpdate = ignoreNextContentRef.current;

    setIsLoading(true);
    try {
      // The module cache dedupes with any prefetch and remembers past hops
      // (so "1手戻す" is instant). Tries the page id first, then the title.
      const result = await loadArticle(locale, { id: articleId, title: requestedTitle });
      applyArticleContent(result.title || requestedTitle, result.html, shouldSkipProgressUpdate, articleUrl);
    } catch (error) {
      console.error("記事の取得に失敗しました", error);
      setContent("");
      setDisplayTitle(requestedTitle);
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
    setArticleId(undefined);
    setTitle(previous.title);
  };

  const start = async (mode: StartMode = "random", options?: StartOptions) => {
    if (stroke > 0) {
      const shouldRestart = await confirm({
        title: "別のお題でやり直しますか？",
        description: "現在の進行状況は失われます。",
        confirmLabel: "やり直す",
        cancelLabel: "続ける",
      });
      if (!shouldRestart) return;
    }
    setActiveSheet(null);
    setIsResultDismissed(false);
    setIsCelebrating(false);
    setGameState("idle");
    setHintModal(false);
    setStroke(-1);
    setHistory([]);
    setGoal("");
    setGoalArticle("");
    setDisplayTitle("");
    setIsGoalDetailsView(false);
    setIsDailyStartup(isDailyGameMode(mode));
    setActiveMode(mode);

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
        setArticleId(challenge.start.id);
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
      console.warn("Daily challenge start article could not be resolved. Falling back to random start.");
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
        setArticleId(undefined);
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
          void router.replace(
            {
              pathname: router.pathname,
              query: {
                start: "random",
                startTitle: options.startTitle,
                goalTitle: options.goalTitle,
                locale: targetLocale,
                ...(isHintEnabled ? { hint: "1" } : {}),
              },
            },
            undefined,
            { shallow: true },
          );
        }
        return;
      }
    }

    setIsDailyMode(false);
    setIsDailyStartup(false);
    const [randomStartTitle, randomGoalTitle] = await Promise.all([pickStart(), getGoal()]);

    if (randomStartTitle && randomGoalTitle) {
      autoStartRef.current = true;
      void router.replace(
        {
          pathname: router.pathname,
          query: {
            start: "random",
            startTitle: randomStartTitle,
            goalTitle: randomGoalTitle,
            locale,
            ...(isHintEnabled ? { hint: "1" } : {}),
          },
        },
        undefined,
        { shallow: true },
      );
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
    let isCancelled = false;

    // Clear expired cache first
    clearExpiredDailyChallengeCache();

    // Try to load from cache immediately for faster initial display
    const cached = readCachedDailyChallenge(locale);
    if (cached && !isCancelled) {
      setDailyChallenge(cached);
    }

    // Then load/refresh from server
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
    const hintParam = decodeQueryParam(router.query.hint);

    // Set hint enabled state based on query parameter
    setIsHintEnabled(hintParam === "1");

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
  }, [
    router.isReady,
    router.query.start,
    router.query.startTitle,
    router.query.goalTitle,
    router.query.locale,
    router.query.hint,
  ]);

  const handleReplay = useCallback(() => {
    const params = new URLSearchParams();
    if (isDailyMode) {
      params.set("start", isTimeAttackMode ? "daily-ta" : "daily");
    } else {
      const startTitle = history.length > 0 ? history[0].title : title;
      params.set("start", "custom");
      params.set("startTitle", startTitle);
      params.set("goalTitle", goal);
      params.set("locale", locale);
    }
    if (isHintEnabled) {
      params.set("hint", "1");
    }
    leavingRef.current = true;
    window.location.href = `/game?${params.toString()}`;
  }, [isDailyMode, isTimeAttackMode, history, title, goal, locale, isHintEnabled]);

  const activeArticleHtml = isGoalDetailsView ? goalArticle : content;
  const isPrimaryArticleLoading = isGoalDetailsView ? isGoalLoading : isLoading;
  const isDailyRunActive = isDailyMode && gameState === "playing";
  const shouldShowDailyStartup = isDailyStartup && !isGoalDetailsView;
  const startArticleTitle =
    history.length > 0 ? history[0].title : title || (isDailyMode ? dailyChallenge?.start.title : null) || "未設定";
  const headerGoalTitle = goal || (isDailyMode ? dailyChallenge?.goal.title : null) || "未設定";
  const canToggleGoal = Boolean(goal);
  const isCustomMode = Boolean(!isDailyMode && gameState === "playing" && goal && title);
  const canUndo = history.length > 1 && !isTimeAttackMode;
  const undoDisabledReason = isTimeAttackMode ? "タイムアタック中は戻せません" : undefined;
  const reached = gameState === "gameover";
  const mode: GameMode =
    !activeMode && gameState === "idle"
      ? "idle"
      : isDailyMode || activeMode === "daily" || activeMode === "daily-ta"
        ? isTimeAttackMode || activeMode === "daily-ta"
          ? "daily-ta"
          : "daily"
        : activeMode === "custom"
          ? "custom"
          : "random";

  const toggleGoalView = () => {
    if (!canToggleGoal) return;
    setIsGoalDetailsView((prev) => !prev);
    setActiveSheet(null);
  };

  const pageTitle = goal ? `${headerGoalTitle} へ — Wikipedia Golf` : "プレイ — Wikipedia Golf";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Head>
        <title>{pageTitle}</title>
      </Head>

      <TopBar
        startTitle={startArticleTitle}
        goalTitle={headerGoalTitle}
        stroke={stroke}
        elapsedTime={elapsedTime}
        isTimeAttackMode={isTimeAttackMode}
        mode={mode}
        isHintEnabled={isHintEnabled}
        isHintOpen={isHintModalOpen}
        onToggleHints={() => setHintModal((prev) => !prev)}
        showShareUrl={isCustomMode}
        isUrlCopied={isUrlCopied}
        onCopyUrl={() => void handleCopyCustomUrl()}
        canToggleGoal={canToggleGoal}
        isGoalDetailsView={isGoalDetailsView}
        onToggleGoal={toggleGoalView}
        onReturnToTitle={() => void handleReturnToTitle()}
      />

      {/* Mobile: start → goal strip */}
      <div className="border-b border-rule bg-paper-2/60 lg:hidden">
        <button
          type="button"
          onClick={() => setActiveSheet("goal")}
          className="mx-auto flex w-full max-w-shell items-center gap-2 px-4 py-2 text-left text-[13px] sm:px-6"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-medium text-ink">{startArticleTitle}</span>
          <svg width="20" height="10" viewBox="0 0 28 10" aria-hidden className="shrink-0 text-rule-2">
            <path d="M0 5h24M20 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <FlagIcon size={13} className="shrink-0 text-gold" />
          <span className="min-w-0 flex-1 truncate font-medium text-ink">{headerGoalTitle}</span>
        </button>
      </div>

      <main className="mx-auto flex w-full max-w-shell flex-col gap-6 px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:flex-row lg:items-start lg:gap-8 lg:pb-12">
        {/* Desktop sidebar */}
        <aside className="scroll-thin hidden w-[21rem] shrink-0 flex-col gap-4 lg:sticky lg:top-20 lg:flex lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <Scorecard stroke={stroke} isTimeAttackMode={isTimeAttackMode} elapsedTime={elapsedTime} mode={mode} />
          <GoalCard
            goal={goal}
            numOfReferer={numOfReferer}
            isLoading={isGoalLoading || shouldShowDailyStartup}
            isGoalDetailsView={isGoalDetailsView}
            onToggleView={toggleGoalView}
          />
          <RouteTimeline
            history={history}
            goal={goal}
            reached={reached}
            canUndo={canUndo}
            undoDisabledReason={undoDisabledReason}
            onUndo={handleBackClick}
          />
          {isHintEnabled && isHintModalOpen && gameState !== "idle" && (
            <HintsPanel hints={hints} isLoading={isGoalLoading && hints.length === 0} />
          )}
          <DailyCard challenge={dailyChallenge} isActive={isDailyRunActive} onStart={() => void start("daily")} />
          <section className="rounded-card border border-dashed border-rule-2 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-3">New hole</p>
            <Button
              className="mt-3"
              full
              size="sm"
              variant="secondary"
              leading={<DiceIcon size={15} />}
              onClick={() => void start("random")}
            >
              ランダムなお題でスタート
            </Button>
          </section>
        </aside>

        <section className="min-w-0 flex-1">
          <ArticleView
            title={displayTitle || title}
            goal={goal}
            html={activeArticleHtml}
            isGoalDetailsView={isGoalDetailsView}
            isLoading={isPrimaryArticleLoading}
            isDailyStartup={shouldShowDailyStartup}
            isDailyMode={isDailyMode}
            gameState={gameState}
            canToggleGoal={canToggleGoal}
            onToggleGoal={toggleGoalView}
            locale={locale}
            idleActions={
              <>
                <Button
                  variant="accent"
                  size="sm"
                  leading={<CalendarIcon size={15} />}
                  disabled={!dailyChallenge}
                  onClick={() => void start("daily")}
                >
                  今日のお題でスタート
                </Button>
                <Button variant="secondary" size="sm" leading={<DiceIcon size={15} />} onClick={() => void start("random")}>
                  ランダムでスタート
                </Button>
              </>
            }
          />
        </section>
      </main>

      {/* Reopen result after "記事を見る" */}
      {gameState === "gameover" && isResultDismissed && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[4.75rem] z-40 flex justify-center px-4 lg:bottom-6">
          <button
            type="button"
            onClick={() => setIsResultDismissed(false)}
            className="pointer-events-auto flex animate-fade-up items-center gap-3 rounded-full border border-green/40 bg-paper-2 py-2 pl-3 pr-4 text-sm font-semibold text-ink shadow-paper-lg transition hover:border-green"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-green text-white">
              <TrophyIcon size={16} />
            </span>
            ゴール達成 · {stroke}打
            <span className="text-green">結果を見る</span>
          </button>
        </div>
      )}

      <MobileDock
        active={activeSheet}
        onOpen={(sheet) => setActiveSheet((prev) => (prev === sheet ? null : sheet))}
        routeCount={history.length}
        isHintEnabled={isHintEnabled}
        isGoalDetailsView={isGoalDetailsView}
      />

      {/* Mobile sheets */}
      <Dialog
        open={activeSheet === "route"}
        onClose={() => setActiveSheet(null)}
        eyebrow="Route"
        title={history.length > 1 ? `辿ったルート · ${history.length - 1} 打` : "辿ったルート"}
        initialFocus={false}
      >
        <RouteTimeline
          history={history}
          goal={goal}
          reached={reached}
          canUndo={canUndo}
          undoDisabledReason={undoDisabledReason}
          onUndo={() => {
            handleBackClick();
            setActiveSheet(null);
          }}
          frame="bare"
          maxHeightClass="max-h-[50vh]"
        />
      </Dialog>

      <Dialog
        open={activeSheet === "goal"}
        onClose={() => setActiveSheet(null)}
        eyebrow="Goal"
        title="ゴールとお題"
        initialFocus={false}
      >
        <GoalCard
          goal={goal}
          numOfReferer={numOfReferer}
          isLoading={isGoalLoading || shouldShowDailyStartup}
          isGoalDetailsView={isGoalDetailsView}
          onToggleView={toggleGoalView}
          frame="bare"
        />
        <div className="my-5 h-px bg-rule" />
        <DailyCard
          challenge={dailyChallenge}
          isActive={isDailyRunActive}
          onStart={() => void start("daily")}
          frame="bare"
        />
      </Dialog>

      <Dialog
        open={activeSheet === "hints"}
        onClose={() => setActiveSheet(null)}
        eyebrow="Hints"
        title="ゴールのリンク元"
        initialFocus={false}
      >
        <HintsPanel hints={hints} isLoading={isGoalLoading && hints.length === 0} frame="bare" maxHeightClass="max-h-[45vh]" />
      </Dialog>

      <Dialog
        open={activeSheet === "menu"}
        onClose={() => setActiveSheet(null)}
        eyebrow="Menu"
        title="メニュー"
        size="sm"
        initialFocus={false}
      >
        <div className="flex flex-col gap-2">
          <Button full variant="accent" leading={<DiceIcon size={16} />} onClick={() => void start("random")}>
            ランダムなお題でスタート
          </Button>
          {!isDailyRunActive && (
            <Button
              full
              variant="secondary"
              leading={<CalendarIcon size={16} />}
              disabled={!dailyChallenge}
              onClick={() => void start("daily")}
            >
              今日のお題に挑戦
            </Button>
          )}
          {canToggleGoal && (
            <Button
              full
              variant="secondary"
              leading={isGoalDetailsView ? <ArrowLeftIcon size={16} /> : <EyeIcon size={16} />}
              onClick={toggleGoalView}
            >
              {isGoalDetailsView ? "現在の記事に戻る" : "ゴール記事を見る"}
            </Button>
          )}
          {isCustomMode && (
            <Button
              full
              variant="secondary"
              leading={isUrlCopied ? <CheckIcon size={16} className="text-green" /> : <LinkIcon size={16} />}
              onClick={() => void handleCopyCustomUrl()}
            >
              {isUrlCopied ? "URLをコピーしました" : "このお題のURLを共有"}
            </Button>
          )}
          <div className="my-1 h-px bg-rule" />
          <Button full variant="ghost" leading={<HomeIcon size={16} />} onClick={() => void handleReturnToTitle()}>
            タイトルに戻る
          </Button>
        </div>
      </Dialog>

      {gameState === "gameover" && isCelebrating && (
        <HoleInCelebration
          strokes={stroke}
          startTitle={history[0]?.title ?? title}
          goalTitle={goal}
          hops={history.slice(1, -1).map((entry) => entry.title)}
          timeLabel={isTimeAttackMode ? `${formatTime(elapsedTime)}秒` : undefined}
          onComplete={() => setIsCelebrating(false)}
        />
      )}
      <ShareModal
        open={gameState === "gameover" && !isResultDismissed && !isCelebrating}
        stroke={stroke}
        history={history}
        goal={goal}
        isDailyMode={isDailyMode}
        isTimeAttackMode={isTimeAttackMode}
        elapsedTime={elapsedTime}
        locale={locale}
        hintEnabled={isHintEnabled}
        onViewArticle={() => setIsResultDismissed(true)}
        onReturnToTitle={() => {
          leavingRef.current = true;
          void router.push("/");
        }}
        onReplay={handleReplay}
      />
      {confirmDialog}
    </div>
  );
}
