import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { BrandMark, Wordmark } from "@/components/Brand";
import { formatJaDate } from "@/components/game/DailyCard";
import { CustomChallengeDialog } from "@/components/home/CustomChallengeDialog";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  ArrowRightIcon,
  BulbIcon,
  CalendarIcon,
  ClockIcon,
  DiceIcon,
  FlagIcon,
  GitHubIcon,
  LinkIcon,
  PenIcon,
  RouteIcon,
  ShareIcon,
} from "@/components/ui/Icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { DailyChallenge } from "@/useCase/dailyChallenge";
import {
  clearExpiredDailyChallengeCache,
  loadDailyChallengeWithCache,
  readCachedDailyChallenge,
} from "@/useCase/dailyChallengeCache";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
  icon: React.ReactNode;
};

const ModeToggle = ({ checked, onChange, label, hint, icon }: ToggleProps) => (
  <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-rule bg-paper-2 px-3.5 py-3 transition hover:border-rule-2">
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
        checked ? "bg-green-soft text-green" : "bg-paper-3 text-ink-3"
      }`}
    >
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      <span className="block text-xs text-ink-2">{hint}</span>
    </span>
    <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="absolute inset-0 rounded-full bg-rule-2 transition peer-checked:bg-green peer-focus-visible:ring-2 peer-focus-visible:ring-green/40" />
      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
    </span>
  </label>
);

export default function Home() {
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [isDailyChallengeLoading, setIsDailyChallengeLoading] = useState(false);
  const [isCustomModalOpen, setCustomModalOpen] = useState(false);
  const [isTimeAttackMode, setIsTimeAttackMode] = useState(false);
  const [isHintMode, setIsHintMode] = useState(true);

  const handleOpenCustomModal = useCallback(() => setCustomModalOpen(true), []);
  const handleCloseCustomModal = useCallback(() => setCustomModalOpen(false), []);

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

  const isDailyChallengeLoaded = Boolean(dailyChallenge?.goal.title && dailyChallenge?.start.title);
  const dailyDate = dailyChallenge?.date ?? new Date().toISOString().slice(0, 10);
  const hintQuery = isHintMode ? "&hint=1" : "";
  const dailyHref = `/game?start=${isTimeAttackMode ? "daily-ta" : "daily"}${hintQuery}`;
  const randomHref = `/game?start=random${hintQuery}`;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Head>
        <title>Wikipedia Golf — 知識の海で、最短ルートを描こう</title>
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
        {/* Hero */}
        <section className="grid gap-10 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pt-20">
          <div className="animate-fade-up">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-green">
              <BallIcon /> A daily link-hopping game
            </p>
            <h1 className="mt-5 font-display text-[2.125rem] font-bold leading-[1.18] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              知識の海で、
              <br />
              最短ルートを描こう。
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
              Wikipedia Golf は、スタート記事からリンクだけを辿って、ゴール記事にできるだけ少ない「打数」で到達するゲームです。
              お題は毎日0時に更新。今日の一打を、友だちと競いましょう。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={randomHref} variant="primary" size="lg" leading={<DiceIcon size={18} />}>
                ランダムなお題に挑戦
              </ButtonLink>
              <Button variant="secondary" size="lg" leading={<PenIcon size={18} />} onClick={handleOpenCustomModal}>
                カスタムお題を作成
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-3 border-t border-rule pt-6 sm:gap-4">
              {[
                { icon: <RouteIcon size={16} />, label: "リンクだけで進む", value: "検索なし" },
                { icon: <FlagIcon size={16} />, label: "少ない打数が勝ち", value: "ゴルフ式" },
                { icon: <CalendarIcon size={16} />, label: "毎日0時に更新", value: "日替わり" },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    {item.icon}
                    {item.value}
                  </dt>
                  <dd className="mt-1 text-[13px] font-medium text-ink sm:text-sm">{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Today's ticket */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <article className="relative overflow-hidden rounded-[1.75rem] border border-green/25 bg-paper-2 shadow-paper-lg">
              <div className="bg-gradient-to-br from-green to-green-2 px-6 pb-8 pt-6 text-white sm:px-8">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">
                    <CalendarIcon size={14} /> Today&apos;s hole
                  </p>
                  <p className="tabular text-xs font-medium text-white/80">{formatJaDate(dailyDate)}</p>
                </div>
                <div className="mt-6 space-y-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Start</p>
                    {dailyChallenge?.start.title ? (
                      <p className="mt-1 break-words font-display text-2xl font-bold leading-snug sm:text-3xl">
                        {dailyChallenge.start.title}
                      </p>
                    ) : (
                      <div className="mt-2 h-8 w-3/4 animate-pulse rounded-lg bg-white/25" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-white/60" aria-hidden>
                    <span className="h-px flex-1 border-t border-dashed border-white/40" />
                    <ArrowRightIcon size={16} />
                    <span className="h-px flex-1 border-t border-dashed border-white/40" />
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                      <FlagIcon size={12} /> Goal
                    </p>
                    {dailyChallenge?.goal.title ? (
                      <p className="mt-1 break-words font-display text-2xl font-bold leading-snug sm:text-3xl">
                        {dailyChallenge.goal.title}
                      </p>
                    ) : (
                      <div className="mt-2 h-8 w-2/3 animate-pulse rounded-lg bg-white/25" />
                    )}
                  </div>
                </div>
              </div>

              {/* perforation */}
              <div className="relative h-0 border-t border-dashed border-rule-2">
                <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-paper" />
                <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-paper" />
              </div>

              <div className="space-y-3 px-6 py-6 sm:px-8">
                <ModeToggle
                  checked={isTimeAttackMode}
                  onChange={setIsTimeAttackMode}
                  label="タイムアタック"
                  hint="打数に加えてタイムも記録。1手戻しは使えません。"
                  icon={<ClockIcon size={18} />}
                />
                <ModeToggle
                  checked={isHintMode}
                  onChange={setIsHintMode}
                  label="ヒントあり"
                  hint="ゴール記事にリンクしている記事の一覧を見られます。"
                  icon={<BulbIcon size={18} />}
                />
                <ButtonLink
                  href={isDailyChallengeLoaded ? dailyHref : "#"}
                  variant="accent"
                  size="lg"
                  full
                  trailing={<ArrowRightIcon size={18} />}
                  disabled={!isDailyChallengeLoaded}
                  className="mt-2"
                >
                  {isDailyChallengeLoading && !isDailyChallengeLoaded ? "お題を読み込み中…" : "今日のお題でスタート"}
                </ButtonLink>
              </div>
            </article>
          </div>
        </section>

        {/* How to play */}
        <section className="mt-24" aria-labelledby="how-to-play">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-green">How to play</p>
              <h2 id="how-to-play" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                遊び方は、3ステップ。
              </h2>
            </div>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "お題を選ぶ",
                body: "今日のお題、ランダム、カスタムから選んでティーオフ。スタート記事がそのままコースになります。",
                icon: <CalendarIcon size={22} />,
              },
              {
                step: "02",
                title: "リンクを辿る",
                body: "記事内のリンクをクリックして次の記事へ。1クリックが1打。検索やURL入力は使えません。",
                icon: <RouteIcon size={22} />,
              },
              {
                step: "03",
                title: "ゴールして共有",
                body: "ゴール記事に着いたらホールアウト。打数とルートをXやテキストでシェアして、友だちと比べましょう。",
                icon: <ShareIcon size={22} />,
              },
            ].map((item) => (
              <li
                key={item.step}
                className="group relative rounded-card border border-rule bg-paper-2 p-6 shadow-paper transition hover:-translate-y-0.5 hover:shadow-paper-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-green-soft text-green">{item.icon}</span>
                  <span
                    className="tabular font-numeral text-4xl font-semibold text-rule-2 transition group-hover:text-green/50"
                    style={{ fontVariationSettings: '"opsz" 96' }}
                  >
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Modes */}
        <section className="mt-24 grid gap-5 lg:grid-cols-3" aria-labelledby="modes">
          <div className="lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-green">Modes</p>
            <h2 id="modes" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              3つの遊び方。
            </h2>
          </div>
          {[
            {
              icon: <CalendarIcon size={20} />,
              title: "今日のお題",
              body: "全員が同じスタートとゴールに挑む日替わりモード。タイムアタックとヒントの有無を選べます。",
              action: (
                <ButtonLink href={dailyHref} size="sm" variant="secondary" disabled={!isDailyChallengeLoaded} trailing={<ArrowRightIcon size={14} />}>
                  今日のお題へ
                </ButtonLink>
              ),
            },
            {
              icon: <DiceIcon size={20} />,
              title: "ランダム",
              body: "スタートもゴールもランダム。思いもよらない記事の組み合わせから、最短の道筋を見つけましょう。",
              action: (
                <ButtonLink href={randomHref} size="sm" variant="secondary" trailing={<ArrowRightIcon size={14} />}>
                  ランダムで遊ぶ
                </ButtonLink>
              ),
            },
            {
              icon: <PenIcon size={20} />,
              title: "カスタム",
              body: "好きなスタートとゴールを指定。URLを共有すれば、友だちも同じお題に挑戦できます。日本語版・英語版に対応。",
              action: (
                <Button size="sm" variant="secondary" onClick={handleOpenCustomModal} trailing={<LinkIcon size={14} />}>
                  お題を作る
                </Button>
              ),
            },
          ].map((item) => (
            <article key={item.title} className="flex flex-col rounded-card border border-rule bg-paper-2 p-6 shadow-paper">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-paper-3 text-ink">{item.icon}</span>
              <h3 className="mt-4 font-display text-xl font-bold">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{item.body}</p>
              <div className="mt-5">{item.action}</div>
            </article>
          ))}
        </section>

        {/* Why */}
        <section className="mt-24 rounded-[1.75rem] border border-rule bg-paper-2 p-8 shadow-paper sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-green">Why it&apos;s fun</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                寄り道も、知識のうち。
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-2 sm:text-base">
                目的地への最短ルートを考える戦略性と、思いがけない記事との出会い。
                辿ったルートを振り返れば、あなたの頭の中の「知識の地図」が見えてきます。
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                "知らなかったトピックに、リンク1本で出会える。",
                "最短ルートを推理する、思考ゲームとしての奥深さ。",
                "辿ったルートをコピーして、友だちと比べられる。",
                "日替わりモードで、毎日みんなが同じお題に挑戦。",
              ].map((text) => (
                <li key={text} className="flex gap-3 rounded-2xl bg-paper p-4 text-sm leading-relaxed text-ink">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-soft text-green">
                    <FlagIcon size={11} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-shell flex-col items-start justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark size={28} />
            <p className="text-sm text-ink-2">
              Wikipedia Golf — 記事データは各言語版 Wikipedia より取得しています。
            </p>
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

      <CustomChallengeDialog open={isCustomModalOpen} onClose={handleCloseCustomModal} hintEnabled={isHintMode} />
    </div>
  );
}

const BallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <circle cx="12" cy="12" r="8" />
    <circle cx="9.5" cy="9.5" r="0.8" fill="currentColor" />
    <circle cx="13.5" cy="8.5" r="0.8" fill="currentColor" />
    <circle cx="14.5" cy="12.5" r="0.8" fill="currentColor" />
    <circle cx="10.5" cy="13.5" r="0.8" fill="currentColor" />
  </svg>
);
