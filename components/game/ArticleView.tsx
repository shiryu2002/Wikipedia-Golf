import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon, EyeIcon, FlagIcon } from "@/components/ui/Icons";
import { Spinner } from "@/components/ui/Spinner";

type ArticleViewProps = {
  title: string;
  goal: string;
  html: string;
  isGoalDetailsView: boolean;
  isLoading: boolean;
  isDailyStartup: boolean;
  isDailyMode: boolean;
  gameState: "idle" | "playing" | "gameover";
  canToggleGoal: boolean;
  onToggleGoal: () => void;
  locale: "ja" | "en";
  /** Buttons shown in the idle (no game yet) state. */
  idleActions?: ReactNode;
};

const LoadingState = ({ label }: { label: string }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-ink-2">
    <Spinner size={44} className="text-green" />
    <p className="text-sm font-medium tracking-wide">{label}</p>
    <div className="mt-2 w-full max-w-xl space-y-3 opacity-70" aria-hidden>
      <div className="skeleton h-3.5 w-full rounded" />
      <div className="skeleton h-3.5 w-11/12 rounded" />
      <div className="skeleton h-3.5 w-4/5 rounded" />
    </div>
  </div>
);

export const ArticleView = ({
  title,
  goal,
  html,
  isGoalDetailsView,
  isLoading,
  isDailyStartup,
  isDailyMode,
  gameState,
  canToggleGoal,
  onToggleGoal,
  locale,
  idleActions,
}: ArticleViewProps) => {
  const headline = isGoalDetailsView
    ? goal || "ゴール未設定"
    : title || (gameState === "idle" && !isDailyStartup ? "Wikipedia Golf" : "読み込み中…");

  return (
    <article
      className={[
        "relative min-w-0 overflow-hidden rounded-card border bg-page text-page-ink shadow-paper-lg",
        isGoalDetailsView ? "border-gold/50" : "border-rule",
      ].join(" ")}
    >
      {/* Read-only banner for the goal view */}
      {isGoalDetailsView && (
        <div className="flex items-center gap-2 border-b border-gold/30 bg-gold-soft px-5 py-2 text-xs font-semibold text-gold sm:px-8">
          <FlagIcon size={14} />
          ゴール記事を閲覧中 — リンクは無効化されています。読んだら「現在の記事に戻る」で続行。
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-page-ink/10 px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
        <div className="min-w-0 max-w-3xl">
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
              isGoalDetailsView ? "text-gold" : "text-green"
            }`}
          >
            {isGoalDetailsView ? "Goal article" : "Current article"}
            <span className="ml-2 font-normal normal-case tracking-normal text-ink-3">{locale}.wikipedia.org</span>
          </p>
          <h1
            key={headline}
            className="mt-2 animate-fade-up break-words font-display text-[1.75rem] font-bold leading-[1.25] tracking-tight text-page-ink sm:text-[2.125rem]"
          >
            {headline}
          </h1>
          {isGoalDetailsView && isDailyMode && (
            <p className="mt-2 text-xs text-page-ink/60">今日のお題モードで選ばれたゴール記事です。</p>
          )}
        </div>
        {canToggleGoal && (
          <Button
            size="sm"
            variant={isGoalDetailsView ? "primary" : "secondary"}
            leading={isGoalDetailsView ? <ArrowLeftIcon size={15} /> : <EyeIcon size={15} />}
            onClick={onToggleGoal}
            className="shrink-0"
          >
            {isGoalDetailsView ? "現在の記事に戻る" : "ゴール記事を見る"}
          </Button>
        )}
      </header>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        {isDailyStartup ? (
          <LoadingState label="今日のお題を取得中…" />
        ) : isLoading ? (
          <LoadingState label={isGoalDetailsView ? "ゴール記事を取得中…" : "記事を取得中…"} />
        ) : html ? (
          <div
            key={`${isGoalDetailsView ? "goal" : "current"}:${headline}`}
            id="articleContent"
            className="article-content animate-fade-in"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : gameState === "idle" ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-center text-page-ink/60">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-page-ink/[0.06]">
              <FlagIcon size={26} className="text-green" />
            </span>
            <p className="font-display text-lg font-bold text-page-ink">お題を選んでティーオフ</p>
            <p className="max-w-sm text-sm leading-relaxed">
              ゲームを開始すると、スタート記事がここに表示されます。リンクをクリックして進みましょう。
            </p>
            {idleActions ? <div className="mt-4 flex flex-col gap-2 sm:flex-row">{idleActions}</div> : null}
          </div>
        ) : (
          <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-center text-page-ink/60">
            <p className="font-display text-lg font-bold text-page-ink">記事を読み込めませんでした</p>
            <p className="max-w-sm text-sm leading-relaxed">別のリンクを開くか、時間をおいて再度お試しください。</p>
          </div>
        )}
      </div>
    </article>
  );
};
