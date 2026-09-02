import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/router";

import { formatJaDate } from "@/components/game/DailyCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  ArrowRightIcon,
  BulbIcon,
  CalendarIcon,
  ClockIcon,
  DiceIcon,
  FlagIcon,
  PenIcon,
} from "@/components/ui/Icons";
import type { DailyChallenge } from "@/useCase/dailyChallenge";
import { ArticleField } from "./ArticleField";

type Tab = "daily" | "random" | "custom";
type Locale = "ja" | "en";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "daily", label: "今日のお題", icon: <CalendarIcon size={15} /> },
  { id: "random", label: "ランダム", icon: <DiceIcon size={15} /> },
  { id: "custom", label: "カスタム", icon: <PenIcon size={15} /> },
];

/** Long article titles step down in size so the marker box never breaks. */
const titleSize = (title: string) =>
  title.length <= 8
    ? "text-[1.75rem] sm:text-[2rem]"
    : title.length <= 14
      ? "text-2xl sm:text-[1.75rem]"
      : title.length <= 24
        ? "text-xl sm:text-2xl"
        : "text-lg sm:text-xl";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  icon: ReactNode;
  title?: string;
};

const Switch = ({ checked, onChange, label, icon, title }: SwitchProps) => (
  <label
    title={title}
    className={`inline-flex cursor-pointer select-none items-center gap-2.5 rounded-full border py-2 pl-3.5 pr-2.5 text-sm font-semibold transition ${
      checked ? "border-green/40 bg-green-soft text-ink" : "border-rule bg-paper-2 text-ink-2 hover:border-rule-2"
    }`}
  >
    <span className={checked ? "text-green" : "text-ink-3"}>{icon}</span>
    {label}
    <span className="relative inline-flex h-5 w-9 items-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="absolute inset-0 rounded-full bg-rule-2 transition peer-checked:bg-green peer-focus-visible:ring-2 peer-focus-visible:ring-green/40" />
      <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
    </span>
  </label>
);

type MarkerProps = {
  kind: "tee" | "hole";
  children: ReactNode;
};

const Marker = ({ kind, children }: MarkerProps) => (
  <div
    className={`relative flex min-h-[9.5rem] min-w-0 flex-col rounded-2xl border p-5 sm:p-6 ${
      kind === "tee" ? "border-rule bg-paper" : "border-gold/40 bg-gold-soft/40"
    }`}
  >
    <p
      className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${
        kind === "tee" ? "text-ink-3" : "text-gold"
      }`}
    >
      {kind === "tee" ? <span className="h-2 w-2 rounded-full bg-ink" aria-hidden /> : <FlagIcon size={12} />}
      {kind === "tee" ? "Tee · スタート" : "Hole · ゴール"}
    </p>
    <div className="mt-3 flex min-w-0 flex-1 flex-col justify-center">{children}</div>
  </div>
);

const MarkerTitle = ({ title }: { title: string }) => (
  <p className={`break-words font-display font-bold leading-[1.3] tracking-tight text-ink [overflow-wrap:anywhere] ${titleSize(title)}`}>
    {title}
  </p>
);

const MarkerSkeleton = () => (
  <div className="space-y-2" aria-label="読み込み中">
    <div className="skeleton h-7 w-4/5 rounded-md" />
    <div className="skeleton h-7 w-1/2 rounded-md" />
  </div>
);

const MarkerMuted = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <p className="flex items-center gap-2 font-display text-xl font-bold text-ink-3">
    <span className="text-ink-3">{icon}</span>
    {children}
  </p>
);

/** The dotted fairway between tee and hole, with the unknown score. */
const Fairway = () => (
  <div className="relative flex items-center justify-center lg:min-w-[12rem]">
    {/* Horizontal (desktop) */}
    <svg viewBox="0 0 240 110" className="hidden h-[110px] w-full max-w-[15rem] text-rule-2 lg:block" aria-hidden>
      <path
        d="M8 74 C 70 20, 120 122, 232 46"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1.5 8"
      />
      <circle cx="8" cy="74" r="4.5" className="fill-ink" />
      <circle cx="232" cy="46" r="4.5" className="fill-gold" />
    </svg>
    {/* Vertical (mobile) */}
    <div className="flex h-24 items-center gap-5 lg:hidden" aria-hidden>
      <span className="relative h-full w-px border-l-2 border-dashed border-rule-2">
        <span className="absolute -left-[5px] -top-1 h-2 w-2 rounded-full bg-ink" />
        <span className="absolute -bottom-1 -left-[5px] h-2 w-2 rounded-full bg-gold" />
      </span>
    </div>
    <p className="absolute left-[calc(50%+1.25rem)] top-1/2 flex -translate-y-1/2 items-baseline gap-1 lg:left-1/2 lg:top-0 lg:-translate-x-1/2 lg:translate-y-0">
      <span className="font-numeral text-5xl font-semibold leading-none text-ink" style={{ fontVariationSettings: '"opsz" 144' }}>
        ?
      </span>
      <span className="text-sm font-semibold text-ink-3">打</span>
    </p>
  </div>
);

type HoleBoardProps = {
  challenge: DailyChallenge | null;
  isLoading: boolean;
};

export const HoleBoard = ({ challenge, isLoading }: HoleBoardProps) => {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("daily");
  const [isTimeAttack, setIsTimeAttack] = useState(false);
  const [isHint, setIsHint] = useState(true);
  const [locale, setLocale] = useState<Locale>("ja");
  const [customStart, setCustomStart] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDailyLoaded = Boolean(challenge?.start.title && challenge?.goal.title);
  const hintQuery = isHint ? "&hint=1" : "";
  const dailyHref = `/game?start=${isTimeAttack ? "daily-ta" : "daily"}${hintQuery}`;
  const randomHref = `/game?start=random${hintQuery}`;

  const submitCustom = useCallback(async () => {
    const start = customStart.trim();
    const goal = customGoal.trim();
    if (!start || !goal) {
      setCustomError("スタートとゴールの記事名を入力してください。");
      return;
    }
    setCustomError(null);
    setIsSubmitting(true);
    try {
      await router.push({
        pathname: "/game",
        query: { start: "custom", startTitle: start, goalTitle: goal, locale, ...(isHint ? { hint: "1" } : {}) },
      });
    } catch (error) {
      console.error("カスタムお題の開始に失敗しました", error);
      setCustomError("お題の開始に失敗しました。時間をおいて再度お試しください。");
      setIsSubmitting(false);
    }
  }, [customStart, customGoal, locale, isHint, router]);

  const holeNumber =
    tab === "daily" ? (challenge?.date ? `No. ${challenge.date.replace(/-/g, ".")}` : "No. —") : tab === "random" ? "No. ????" : "No. CUSTOM";

  return (
    <section
      aria-label="ホールを選ぶ"
      className="rounded-[1.75rem] border border-rule bg-paper-2 shadow-paper-lg"
    >
      {/* Header: tabs + hole number */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 pt-3 sm:px-6">
        <div role="tablist" aria-label="お題の種類" className="-mb-px flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => {
                  setTab(item.id);
                  setCustomError(null);
                }}
                className={`relative flex items-center gap-2 whitespace-nowrap px-3 pb-3 pt-2 text-sm font-semibold transition sm:px-4 ${
                  active ? "text-ink" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                <span className={active ? "text-green" : ""}>{item.icon}</span>
                {item.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-green sm:inset-x-4" aria-hidden />}
              </button>
            );
          })}
        </div>
        <p className="tabular pb-3 pt-2 font-numeral text-sm font-medium tracking-wide text-ink-3">
          {holeNumber}
          {tab === "daily" && challenge?.date ? (
            <span className="ml-3 font-sans text-xs text-ink-3">{formatJaDate(challenge.date)}</span>
          ) : null}
        </p>
      </div>

      {/* Course */}
      <div className="grid gap-3 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch lg:gap-4">
        <Marker kind="tee">
          {tab === "daily" ? (
            challenge?.start.title ? (
              <MarkerTitle title={challenge.start.title} />
            ) : isLoading ? (
              <MarkerSkeleton />
            ) : (
              <MarkerMuted icon={<CalendarIcon size={18} />}>今日のお題を取得できませんでした</MarkerMuted>
            )
          ) : tab === "random" ? (
            <MarkerMuted icon={<DiceIcon size={20} />}>ランダムな記事</MarkerMuted>
          ) : (
            <ArticleField
              id="boardStartTitle"
              label="スタート記事"
              hideLabel
              appearance="plain"
              value={customStart}
              placeholder={locale === "ja" ? "スタート記事を入力（例: 日本）" : "Start article (e.g. Japan)"}
              locale={locale}
              onChange={(value) => {
                setCustomStart(value);
                setCustomError(null);
              }}
            />
          )}
        </Marker>

        <Fairway />

        <Marker kind="hole">
          {tab === "daily" ? (
            challenge?.goal.title ? (
              <MarkerTitle title={challenge.goal.title} />
            ) : isLoading ? (
              <MarkerSkeleton />
            ) : (
              <MarkerMuted icon={<FlagIcon size={18} />}>—</MarkerMuted>
            )
          ) : tab === "random" ? (
            <MarkerMuted icon={<DiceIcon size={20} />}>ランダムな記事</MarkerMuted>
          ) : (
            <ArticleField
              id="boardGoalTitle"
              label="ゴール記事"
              hideLabel
              appearance="plain"
              value={customGoal}
              placeholder={locale === "ja" ? "ゴール記事を入力（例: 光速）" : "Goal article (e.g. Speed of light)"}
              locale={locale}
              onChange={(value) => {
                setCustomGoal(value);
                setCustomError(null);
              }}
            />
          )}
        </Marker>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-b-[1.75rem] border-t border-rule bg-paper/60 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {tab === "custom" && (
            <div className="inline-flex rounded-full border border-rule bg-paper-2 p-1 text-sm font-semibold" role="radiogroup" aria-label="言語版">
              {(["ja", "en"] as Locale[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={locale === option}
                  onClick={() => setLocale(option)}
                  className={`rounded-full px-3.5 py-1.5 transition ${
                    locale === option ? "bg-ink text-paper-2 shadow-sm" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {option === "ja" ? "日本語" : "English"}
                </button>
              ))}
            </div>
          )}
          {tab === "daily" && (
            <Switch
              checked={isTimeAttack}
              onChange={setIsTimeAttack}
              label="タイムアタック"
              icon={<ClockIcon size={16} />}
              title="打数に加えてタイムも記録。1手戻しは使えません。"
            />
          )}
          <Switch
            checked={isHint}
            onChange={setIsHint}
            label="ヒント"
            icon={<BulbIcon size={16} />}
            title="ゴール記事にリンクしている記事の一覧を見られます。"
          />
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {tab === "daily" && (
            <ButtonLink
              href={isDailyLoaded ? dailyHref : "#"}
              variant="accent"
              size="lg"
              trailing={<ArrowRightIcon size={18} />}
              disabled={!isDailyLoaded}
              className="sm:min-w-[16rem]"
            >
              {isLoading && !isDailyLoaded ? "お題を読み込み中…" : "このホールをプレイ"}
            </ButtonLink>
          )}
          {tab === "random" && (
            <ButtonLink href={randomHref} variant="accent" size="lg" trailing={<ArrowRightIcon size={18} />} className="sm:min-w-[16rem]">
              ランダムでティーオフ
            </ButtonLink>
          )}
          {tab === "custom" && (
            <Button
              variant="accent"
              size="lg"
              trailing={<ArrowRightIcon size={18} />}
              disabled={isSubmitting || !customStart.trim() || !customGoal.trim()}
              onClick={() => void submitCustom()}
              className="sm:min-w-[16rem]"
            >
              {isSubmitting ? "開始中…" : "この条件でティーオフ"}
            </Button>
          )}
          {customError && (
            <p className="text-sm text-rose" role="alert">
              {customError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
