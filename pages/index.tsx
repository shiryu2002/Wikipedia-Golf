import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import CircularProgress from "@mui/material/CircularProgress";

import { DailyChallenge } from "@/useCase/dailyChallenge";
import {
  clearExpiredDailyChallengeCache,
  loadDailyChallengeWithCache,
  readCachedDailyChallenge,
} from "@/useCase/dailyChallengeCache";

const useArticleSuggestions = (
  query: string,
  locale: "en" | "ja",
  isActive: boolean,
) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const debounceId = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          action: "query",
          list: "prefixsearch",
          pssearch: trimmed,
          pslimit: "6",
          format: "json",
          origin: "*",
        });
        const endpoint = `https://${locale}.wikipedia.org/w/api.php?${params.toString()}`;
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch prefix search for ${trimmed}`);
        }
        const data = await response.json();
        const resultItems: string[] = Array.isArray(data?.query?.prefixsearch)
          ? data.query.prefixsearch
            .map((item: { title?: string }) => item?.title)
            .filter((title: string | undefined): title is string => Boolean(title))
          : [];
        setSuggestions(resultItems);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("記事サジェストの取得に失敗しました", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(debounceId);
      setIsLoading(false);
    };
  }, [query, locale, isActive]);

  return { suggestions, isLoading };
};

export default function Home() {
  const router = useRouter();
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [isDailyChallengeLoading, setIsDailyChallengeLoading] = useState(false);
  const [isCustomModalOpen, setCustomModalOpen] = useState(false);
  const [customStartTitle, setCustomStartTitle] = useState("");
  const [customGoalTitle, setCustomGoalTitle] = useState("");
  const [customLocale, setCustomLocale] = useState<"ja" | "en">("ja");
  const [customError, setCustomError] = useState<string | null>(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showGoalSuggestions, setShowGoalSuggestions] = useState(false);
  const [isTimeAttackMode, setIsTimeAttackMode] = useState(false);
  const [isHintMode, setIsHintMode] = useState(false);

  const {
    suggestions: startSuggestions,
    isLoading: isStartSuggestionsLoading,
  } = useArticleSuggestions(
    customStartTitle,
    customLocale,
    isCustomModalOpen && showStartSuggestions,
  );
  const {
    suggestions: goalSuggestions,
    isLoading: isGoalSuggestionsLoading,
  } = useArticleSuggestions(
    customGoalTitle,
    customLocale,
    isCustomModalOpen && showGoalSuggestions,
  );

  const handleOpenCustomModal = useCallback(() => {
    setCustomError(null);
    setCustomModalOpen(true);
  }, []);

  const handleCloseCustomModal = useCallback(() => {
    setCustomError(null);
    setShowStartSuggestions(false);
    setShowGoalSuggestions(false);
    setCustomModalOpen(false);
  }, []);

  const handleSuggestionSelect = useCallback((type: "start" | "goal", value: string) => {
    if (type === "start") {
      setCustomStartTitle(value);
      setShowStartSuggestions(false);
    } else {
      setCustomGoalTitle(value);
      setShowGoalSuggestions(false);
    }
  }, []);

  const handleLocaleChange = useCallback((nextLocale: "ja" | "en") => {
    setCustomLocale(nextLocale);
    setShowStartSuggestions(false);
    setShowGoalSuggestions(false);
  }, []);

  const handleCustomSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedStart = customStartTitle.trim();
    const trimmedGoal = customGoalTitle.trim();

    if (!trimmedStart || !trimmedGoal) {
      setCustomError("スタートとゴールの記事名を入力してください。");
      return;
    }

    setCustomError(null);
    setIsSubmittingCustom(true);
    try {
      await router.push({
        pathname: "/game",
        query: {
          start: "custom",
          startTitle: trimmedStart,
          goalTitle: trimmedGoal,
          locale: customLocale,
        },
      });
      handleCloseCustomModal();
    } catch (error) {
      console.error("カスタムお題の開始に失敗しました", error);
      setCustomError("お題の開始に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmittingCustom(false);
    }
  }, [customStartTitle, customGoalTitle, customLocale, router, handleCloseCustomModal]);

  useEffect(() => {
    if (!isCustomModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isCustomModalOpen]);

  useEffect(() => {
    if (!isCustomModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseCustomModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCustomModalOpen, handleCloseCustomModal]);

  useEffect(() => {
    let isCancelled = false;
    clearExpiredDailyChallengeCache();

    if (typeof window !== "undefined" && !isCancelled) {
      const cached = readCachedDailyChallenge("ja");
      if (cached) {
        setDailyChallenge(cached);
      } else {
        // No cached data, show loading state
        setIsDailyChallengeLoading(true);
      }
    }

    const loadChallenge = async () => {
      setIsDailyChallengeLoading(true);
      try {
        const challenge = await loadDailyChallengeWithCache("ja");
        if (!isCancelled) {
          setDailyChallenge(challenge);
        }
      } catch (error) {
        console.error("デイリーチャレンジの取得に失敗しました", error);
        if (!isCancelled) {
          setDailyChallenge(null);
        }
      } finally {
        if (!isCancelled) {
          setIsDailyChallengeLoading(false);
        }
      }
    };

    loadChallenge();

    return () => {
      isCancelled = true;
    };
  }, []);

  const dailyGoalTitle = dailyChallenge?.goal.title ?? "読み込み中";
  const dailyStartTitle = dailyChallenge?.start.title ?? "読み込み中";
  const dailyGoalDate = dailyChallenge?.date ?? new Date().toISOString().slice(0, 10);
  const isDailyChallengeLoaded = Boolean(dailyChallenge?.goal.title && dailyChallenge?.start.title);
  const isCustomSubmitDisabled = isSubmittingCustom
    || !customStartTitle.trim()
    || !customGoalTitle.trim();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/w2.png"
                alt="Wikipedia Golf アイコン"
                width={64}
                height={64}
                className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16"
                priority
              />
              <div className="max-w-2xl">
                <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">
                  Wikipedia Golf
                </h1>
                <p className="mt-2 text-sm text-slate-400 sm:text-base">
                  知識の海で最短ルートを描こう
                </p>
              </div>
            </div>

            {/* <div className="hidden md:flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                className="w-full rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400 sm:w-auto"
                href="/game?start=daily"
              >
                今日のお題でプレイ
              </Link>
              <Link
                className="w-full rounded-full border border-blue-300/60 px-5 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200 hover:text-white sm:w-auto"
                href="/game?start=random"
              >
                ランダムに挑戦
              </Link>
              <button
                type="button"
                onClick={handleOpenCustomModal}
                className="w-full rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                カスタムお題を作成
              </button>
            </div> */}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-4 sm:px-6 sm:py-12">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-slate-900 p-8 text-white shadow-2xl">
            <p className="text-sm text-white/70">
              今日のお題
            </p>
            <p className="mt-2 flex items-center gap-2 text-3xl font-semibold leading-tight md:text-4xl">
              スタート: {dailyStartTitle}
              {isDailyChallengeLoading && !dailyChallenge?.start?.title && (
                <CircularProgress size={24} className="text-white" sx={{ color: 'white' }} />
              )}
            </p>
            <p className="mt-2 flex items-center gap-2 text-3xl font-semibold leading-tight md:text-4xl">
              ゴール: {dailyGoalTitle}
              {isDailyChallengeLoading && !dailyChallenge?.goal?.title && (
                <CircularProgress size={24} className="text-white" sx={{ color: 'white' }} />
              )}
            </p>
            <p className="mt-4 text-sm text-white/80">{dailyGoalDate} のチャレンジ</p>
            <div className="mt-8 space-y-4">
              {/* Daily Challenge Section with Mode Selector */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15">
                    <input
                      type="checkbox"
                      checked={isTimeAttackMode}
                      onChange={(e) => setIsTimeAttackMode(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-white/30 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-0"
                    />
                    <span>タイムアタック(TA)</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15">
                    <input
                      type="checkbox"
                      checked={isHintMode}
                      onChange={(e) => setIsHintMode(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-white/30 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-0"
                    />
                    <span>ヒントあり</span>
                  </label>
                  <Link
                    className={`flex-1 rounded-full px-6 py-3 text-center text-sm font-semibold shadow-lg transition sm:flex-initial ${
                      isDailyChallengeLoaded
                        ? "bg-white text-slate-900 hover:bg-slate-100"
                        : "cursor-not-allowed bg-white/40 text-slate-500"
                    }`}
                    href={isDailyChallengeLoaded ? `/game?start=${isTimeAttackMode ? "daily-ta" : "daily"}${isHintMode ? "&hint=1" : ""}` : "#"}
                    onClick={(e) => {
                      if (!isDailyChallengeLoaded) {
                        e.preventDefault();
                      }
                    }}
                  >
                    今日のお題でスタート
                  </Link>
                </div>
              </div>

              {/* Secondary Actions */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  className="flex-1 rounded-full border border-white/60 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                  href={`/game?start=random${isHintMode ? "&hint=1" : ""}`}
                >
                  ランダムなお題に挑戦
                </Link>
                <button
                  type="button"
                  onClick={handleOpenCustomModal}
                  className="flex-1 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  カスタムお題を作成
                </button>
              </div>
            </div>
          </div>
          <article className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-xl backdrop-blur">
            <h2 className="text-2xl font-semibold">ゲームの遊び方</h2>
            <p className="mt-4 text-xl text-slate-200">
              Wikipediaゴルフは、スタート記事からリンクだけを辿り、ゴールの記事にできるだけ少ない手数で到達することを目指すシンプルなゲームです。
            </p>
            <ol className="mt-6 space-y-3 text-sm text-slate-200">
              <li>スタートページを開き、リンクの行き先をイメージします。</li>
              <li>目標となるゴール記事を確認し、ルートを思い描きます。</li>
              <li>リンクを辿りながら最短を探し、手数を更新していきます。</li>
              <li>ゴール到達後は結果をシェアして仲間と競い合いましょう。</li>
            </ol>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-xl backdrop-blur">
          <h2 className="text-2xl font-semibold">プレイの流れ</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">
                Step 01
              </p>
              <h3 className="mt-3 text-lg font-semibold">お題を選ぶ</h3>
              <p className="mt-2 text-sm text-slate-200">
                今日のお題またはランダムスタートを選んでゲームを開始しましょう。
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">
                Step 02
              </p>
              <h3 className="mt-3 text-lg font-semibold">リンクを辿る</h3>
              <p className="mt-2 text-sm text-slate-200">
                直感や推理を頼りに、ゴール記事へとつながる可能性の高いリンクを選びます。
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">
                Step 03
              </p>
              <h3 className="mt-3 text-lg font-semibold">結果を共有</h3>
              <p className="mt-2 text-sm text-slate-200">
                プレイログをシェアして、他のプレイヤーとルートや手数を比較しましょう。
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-xl backdrop-blur">
            <h2 className="text-2xl font-semibold">ゲームの魅力</h2>
            <ul className="mt-6 space-y-4 text-sm text-slate-200">
              <li>多彩な記事に触れることで、知らなかったトピックを発見できます。</li>
              <li>最短ルートを考える戦略性があり、思考ゲームとしても楽しめます。</li>
              <li>プレイログを振り返ることで、辿ったルートを他のプレイヤーと共有できます。</li>
              <li>日替わりモードで、毎日全員が同じお題に挑戦できます。</li>
            </ul>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-xl backdrop-blur">
            <h2 className="text-2xl font-semibold">バグ報告はこちら</h2>
            <ul className="mt-6 space-y-4 text-sm text-slate-200">
              <li>
                <a
                  href="https://github.com/shiryu2002/Wikipedia-Golf/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:underline hover:text-blue-400 text-xl"
                >
                  GitHub Issues でバグ報告・要望を送る
                </a>
              </li>
            </ul>
          </article>
        </section>
      </main>
      {isCustomModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-[min(90vw,34rem)] rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-white shadow-[0_35px_80px_-20px_rgba(15,23,42,0.8)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-blue-200/80">
                  Custom Challenge
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight">
                  カスタムお題を作成
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  スタートとゴールの記事名を入力すると、同じ条件でゲームを開始できます。
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCustomModal}
                className="rounded-full border border-white/10 px-3 py-1 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white"
              >
                閉じる
              </button>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleCustomSubmit}>
              <div>
                <span className="text-xs uppercase tracking-[0.3em] text-blue-200">
                  Locale
                </span>
                <div className="mt-3 inline-flex rounded-full border border-white/15 bg-white/5 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleLocaleChange("ja")}
                    className={`rounded-full px-4 py-2 transition ${customLocale === "ja" ? "bg-blue-500 text-white shadow" : "text-slate-200 hover:text-white"}`}
                  >
                    日本語
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocaleChange("en")}
                    className={`rounded-full px-4 py-2 transition ${customLocale === "en" ? "bg-blue-500 text-white shadow" : "text-slate-200 hover:text-white"}`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-100" htmlFor="customStartTitle">
                  スタート記事
                </label>
                <div
                  className="relative mt-3"
                  role="combobox"
                  aria-expanded={showStartSuggestions && startSuggestions.length > 0}
                  aria-haspopup="listbox"
                  aria-controls="customStartSuggestions"
                >
                  <input
                    id="customStartTitle"
                    name="customStartTitle"
                    value={customStartTitle}
                    onChange={(event) => {
                      setCustomStartTitle(event.target.value);
                      setShowStartSuggestions(true);
                    }}
                    onFocus={() => setShowStartSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowStartSuggestions(false), 150)}
                    className="w-full rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="例: 日本"
                    autoFocus
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-controls="customStartSuggestions"
                  />
                  {isStartSuggestionsLoading && (
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-slate-400">
                      検索中…
                    </span>
                  )}
                  {showStartSuggestions && startSuggestions.length > 0 && (
                    <ul
                      className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl"
                      role="listbox"
                      id="customStartSuggestions"
                    >
                      {startSuggestions.map((item) => (
                        <li
                          key={`start-${item}`}
                          className="border-b border-white/5 last:border-none"
                          role="option"
                          aria-selected={false}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSuggestionSelect("start", item)}
                          >
                            <span className="truncate">{item}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-100" htmlFor="customGoalTitle">
                  ゴール記事
                </label>
                <div
                  className="relative mt-3"
                  role="combobox"
                  aria-expanded={showGoalSuggestions && goalSuggestions.length > 0}
                  aria-haspopup="listbox"
                  aria-controls="customGoalSuggestions"
                >
                  <input
                    id="customGoalTitle"
                    name="customGoalTitle"
                    value={customGoalTitle}
                    onChange={(event) => {
                      setCustomGoalTitle(event.target.value);
                      setShowGoalSuggestions(true);
                    }}
                    onFocus={() => setShowGoalSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowGoalSuggestions(false), 150)}
                    className="w-full rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="例: 光速"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-controls="customGoalSuggestions"
                  />
                  {isGoalSuggestionsLoading && (
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-slate-400">
                      検索中…
                    </span>
                  )}
                  {showGoalSuggestions && goalSuggestions.length > 0 && (
                    <ul
                      className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl"
                      role="listbox"
                      id="customGoalSuggestions"
                    >
                      {goalSuggestions.map((item) => (
                        <li
                          key={`goal-${item}`}
                          className="border-b border-white/5 last:border-none"
                          role="option"
                          aria-selected={false}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSuggestionSelect("goal", item)}
                          >
                            <span className="truncate">{item}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {customError && (
                <p className="text-sm text-rose-300">{customError}</p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseCustomModal}
                  className="w-full rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCustomSubmitDisabled}
                  className={`w-full rounded-full px-6 py-3 text-sm font-semibold transition sm:w-auto ${isCustomSubmitDisabled ? "cursor-not-allowed bg-blue-500/40 text-white/70" : "bg-blue-500 text-white shadow-lg hover:bg-blue-400"}`}
                >
                  {isSubmittingCustom ? "開始中…" : "この条件で開始"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
