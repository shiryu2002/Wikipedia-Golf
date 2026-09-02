import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { BrandMark, Wordmark } from "@/components/Brand";
import { HoleBoard } from "@/components/home/HoleBoard";
import { CalendarIcon, GitHubIcon, RouteIcon, ShareIcon } from "@/components/ui/Icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { DailyChallenge } from "@/useCase/dailyChallenge";
import {
  clearExpiredDailyChallengeCache,
  loadDailyChallengeWithCache,
  readCachedDailyChallenge,
} from "@/useCase/dailyChallengeCache";

export default function Home() {
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [isDailyChallengeLoading, setIsDailyChallengeLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    clearExpiredDailyChallengeCache();

    if (typeof window !== "undefined" && !isCancelled) {
      const cached = readCachedDailyChallenge("ja");
      if (cached) {
        setDailyChallenge(cached);
      } else {
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

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Head>
        <title>Wikipedia Golf — リンクだけで、ゴールの記事へ</title>
      </Head>

      <header className="sticky top-0 z-30 border-b border-rule/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-4 sm:px-6">
          <Link href="/" className="rounded-xl transition hover:opacity-80" aria-label="Wikipedia Golf">
            <Wordmark size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/shiryu2002/Wikipedia-Golf"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-2 transition hover:bg-ink/[0.06] hover:text-ink sm:inline-flex"
            >
              <GitHubIcon size={16} /> GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-shell px-4 pb-24 sm:px-6">
        <h1 className="sr-only">Wikipedia Golf</h1>

        {/* The board is the page. */}
        <div className="animate-fade-up pt-8 lg:pt-12">
          <HoleBoard challenge={dailyChallenge} isLoading={isDailyChallengeLoading} />
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
          ローカルルール — 検索と URL の直打ちは禁止。ゴール記事は「閲覧のみ」で下見できる。1手戻しはタイムアタック以外で可。
        </p>

        {/* How to play */}
        <section className="mt-20" aria-labelledby="how-to-play">
          <div className="flex items-baseline gap-4">
            <h2 id="how-to-play" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              遊び方
            </h2>
            <span className="h-px flex-1 bg-rule" aria-hidden />
          </div>
          <ol className="mt-8 grid gap-x-8 gap-y-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "ティーオフ",
                body: "上のボードでホールを選んでスタート。スタート記事がそのままコースになる。",
                icon: <CalendarIcon size={18} />,
              },
              {
                step: "02",
                title: "リンクを踏む",
                body: "記事の中のリンクをクリックして次の記事へ。1クリックが1打。ゴール記事は下見できるが、そこからは進めない。",
                icon: <RouteIcon size={18} />,
              },
              {
                step: "03",
                title: "ホールアウト",
                body: "ゴール記事に着いたら終わり。打数と辿ったルートを X やテキストで残して、友だちの打数と並べる。",
                icon: <ShareIcon size={18} />,
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-4">
                <span
                  className="tabular shrink-0 font-numeral text-4xl font-semibold leading-none text-rule-2"
                  style={{ fontVariationSettings: '"opsz" 96' }}
                >
                  {item.step}
                </span>
                <div className="min-w-0 border-t border-rule pt-1">
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                    <span className="text-green">{item.icon}</span>
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-shell flex-col items-start justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark size={28} />
            <p className="text-sm text-ink-2">Wikipedia Golf — 記事データは各言語版 Wikipedia より取得しています。</p>
          </div>
          <a
            href="https://github.com/shiryu2002/Wikipedia-Golf/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-2 transition hover:text-ink"
          >
            <GitHubIcon size={16} /> バグ報告・要望は GitHub Issues へ
          </a>
        </div>
      </footer>
    </div>
  );
}
