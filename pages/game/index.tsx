import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/router";

import { HintsModal } from "@/components/Hints";
import { ShareModal } from "@/components/Share";
import Image from "next/image";
import {
  DailyChallenge,
  fetchDailyChallenge,
} from "@/useCase/dailyChallenge";
import countReferer from "@/useCase/referer";
import CircularProgress from "@mui/material/CircularProgress";

type StartMode = "random" | "daily";

export default function GamePage() {
  const router = useRouter();
  const autoStartRef = useRef(false);
  const [title, setTitle] = useState<string>("");
  const [locale, setLocale] = useState<"en" | "ja">("ja");
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(
    null
  );
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
  const [hints, setHints] = useState([]);
  const [isHintModalOpen, setHintModal] = useState(false);
  const [isDailyMode, setIsDailyMode] = useState(false);
  const [isDailyStartup, setIsDailyStartup] = useState(false);
  const ignoreNextContentRef = useRef(false);

  const pickStart = async () => {
    try {
      const response = await fetch(
        `https://${locale}.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`
      );
      const data = await response.json();
      const randomTitle = data.query.random[0].title;
      setTitle(randomTitle);
      setGameState("playing");
    } catch (error) {
      console.error("スタートページの取得に失敗しました", error);
    }
  };

  const populateGoalDetails = async (options: {
    title: string;
    pageId?: number;
  }) => {
    setGoal(options.title);
    const ref = await countReferer(options.title, locale);
    setNumOfReferer(ref.numOfRef);
    setHints(ref.hints);

    const goalUrl = options.pageId !== undefined
      ? `https://${locale}.wikipedia.org/w/api.php?action=parse&pageid=${options.pageId}&format=json&origin=*`
      : `https://${locale}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(options.title)}&format=json&origin=*`;

    const response = await fetch(goalUrl);
    const data = await response.json();
    setGoalArticle(data.parse?.text?.["*"] ?? "");
  };

  const getGoal = async () => {
    setIsDailyMode(false);
    setIsGoalLoading(true);
    try {
      const response = await fetch(
        `https://${locale}.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`
      );
      const data = await response.json();
      const randomTitle = data.query.random[0].title;
      await populateGoalDetails({ title: randomTitle });
    } catch (error) {
      console.error("ゴールページの取得に失敗しました", error);
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

      const challenge = await fetchDailyChallenge(locale);
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
    }
  };

  useEffect(() => {
    if (!title) return;
    fetchTitle(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  useEffect(() => {
    const links = document.querySelectorAll("#articleContent a");
    links.forEach((link) => {
      link.addEventListener("click", handleLinkClick);
    });

    return () => {
      links.forEach((link) => {
        link.removeEventListener("click", handleLinkClick);
      });
    };
  }, [content, goalArticle, isGoalDetailsView]);

  const fetchTitle = async (title: string) => {
    setIsLoading(true);
    const encodedTitle = encodeURIComponent(title);
    const url = `https://${locale}.wikipedia.org/w/api.php?action=parse&page=${encodedTitle}&format=json&origin=*`;
    const shouldSkipProgressUpdate = ignoreNextContentRef.current;
    try {
      const response = await fetch(url);
      const data = await response.json();

      setContent(data.parse?.text?.["*"] ?? "");

      if (!shouldSkipProgressUpdate && title !== "メインページ" && gameState === "playing") {
        setStroke((prevStroke) => {
          const nextStroke = prevStroke + 1;
          setHistory((prev) => [
            ...prev,
            { title, url, stroke: nextStroke },
          ]);
          return nextStroke;
        });
      }

      checkIfGameOver(title);
    } catch (error) {
      console.error("記事の取得に失敗しました", error);
      setIsDailyStartup(false);
    } finally {
      setIsLoading(false);
      window.scrollTo(0, 0);
      if (!shouldSkipProgressUpdate) {
        setIsDailyStartup(false);
      }
      ignoreNextContentRef.current = false;
    }
  };

  const handleLinkClick = (event: any) => {
    event.preventDefault();
    const title = event.target.getAttribute("title");
    if (title) {
      setTitle(title);
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

  const start = async (mode: StartMode = "random") => {
    if (stroke > 0) {
      const shouldRestart = window.confirm("別のお題でやり直しますか？");
      if (!shouldRestart) return;
    }
    setGameState("idle");
    setHintModal(false);
    setStroke(-1);
    setHistory([]);
    setGoalArticle("");
    setIsGoalDetailsView(false);
    setIsDailyStartup(mode === "daily");

    if (mode === "daily") {
      ignoreNextContentRef.current = true;
      setContent("");
      const challenge = await resolveDailyChallenge();
      ignoreNextContentRef.current = false;

      if (challenge?.start?.title) {
        setDailyChallenge(challenge);
        setIsDailyMode(true);
        setGameState("playing");
        setTitle(challenge.start.title);

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

    setIsDailyMode(false);
    setIsDailyStartup(false);
    await pickStart();
    await getGoal();
  };

  useEffect(() => {
    let isCancelled = false;
    const loadChallenge = async () => {
      try {
        const challenge = await fetchDailyChallenge(locale);
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
    const startParam = router.query.start;
    const resolvedMode: StartMode | null =
      typeof startParam === "string" &&
        (startParam === "daily" || startParam === "random")
        ? startParam
        : null;
    if (resolvedMode) {
      autoStartRef.current = true;
      void start(resolvedMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.start]);

  const activeArticleHtml = isGoalDetailsView ? goalArticle : content;
  const isPrimaryArticleLoading = isGoalDetailsView ? isGoalLoading : isLoading;
  const todayIso = new Date().toISOString().slice(0, 10);
  const dailyGoalTitle = dailyChallenge?.goal.title ?? "読み込み中";
  const dailyGoalDate = dailyChallenge?.date ?? todayIso;
  const isDailyRunActive = isDailyMode && gameState === "playing";
  const shouldShowDailyStartup = isDailyStartup && !isGoalDetailsView;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="flex shrink-0 items-center leading-tight">
              <Image
                src="/w2.png"
                alt="Wikipedia Golf アイコン"
                width={64}
                height={64}
                className="h-16 w-16 rounded-2xl object-cover mr-4"
                priority
              />
              <h1 className="text-3xl font-semibold text-slate-600 md:text-4xl">
                Wikipedia Golf
              </h1>
              <p className="text-3xl ml-10 tracking-[0.3em] text-slate-400">
                打数:
                <span className="text-4xl font-semibold text-white">
                  {stroke === -1 ? "0" : stroke}
                </span>
              </p>
            </div>


          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400"
              onClick={() => start("random")}
            >
              ランダムでスタート
            </button>
            {!isDailyRunActive && (
              <button
                className="rounded-full border border-blue-300/60 px-5 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200 hover:text-white"
                onClick={() => start("daily")}
              >
                今日のお題に挑戦
              </button>
            )}
            {gameState === "playing" && (
              <button
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                onClick={() => setHintModal(!isHintModalOpen)}
              >
                ヒントを見る
              </button>
            )}
          </div>
          <ShareModal
            gameState={gameState}
            stroke={stroke}
            history={history}
            goal={goal}
          />
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <aside className="flex w-full flex-col gap-6 lg:w-80 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <section className="rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-slate-900 p-6 text-white shadow-2xl">
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
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur">
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

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">辿ったルート</h2>
              <button
                className={`text-xs transition ${history.length <= 1
                  ? "cursor-not-allowed text-slate-500"
                  : "text-blue-200 hover:text-blue-100"
                  }`}
                onClick={handleBackClick}
                disabled={history.length <= 1}
              >
                1手戻す
              </button>
            </div>
            <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-2">
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

          <HintsModal hints={hints} isOpen={isHintModalOpen} />
        </aside>

        <section className="flex-1">
          <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl">
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
              <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-slate-600">
                <CircularProgress />
                <p className="text-sm font-medium tracking-wide">
                  今日のお題を取得中…
                </p>
              </div>
            ) : isPrimaryArticleLoading ? (
              <div className="flex h-[70vh] items-center justify-center">
                <CircularProgress />
              </div>
            ) : activeArticleHtml ? (
              <div
                id="articleContent"
                className="max-w-full text-slate-900 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: activeArticleHtml }}
              />
            ) : gameState === "idle" ? (
              <div className="flex h-[70vh] flex-col items-center justify-center text-sm text-slate-500">
                <p>ゲームを開始すると、記事がここに表示されます。</p>
                <p className="mt-1">お題を選んでプレイを始めてください。</p>
              </div>
            ) : (
              <div className="flex h-[70vh] flex-col items-center justify-center text-sm text-slate-500">
                <p>記事を読み込めませんでした。</p>
                <p className="mt-1">別のリンクを開くか、再度お試しください。</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
