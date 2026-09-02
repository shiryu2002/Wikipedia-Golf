import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon, EyeIcon, FlagIcon, LinkIcon } from "@/components/ui/Icons";

type GoalCardProps = {
  goal: string;
  numOfReferer: number;
  isLoading: boolean;
  isGoalDetailsView: boolean;
  onToggleView: () => void;
  frame?: "panel" | "bare";
};

export const GoalCard = ({
  goal,
  numOfReferer,
  isLoading,
  isGoalDetailsView,
  onToggleView,
  frame = "panel",
}: GoalCardProps) => {
  const hasGoal = Boolean(goal);

  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-soft text-gold">
          <FlagIcon size={17} className="animate-flag-wave origin-left" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Goal</p>
          {hasGoal ? (
            <h2 className="mt-0.5 break-words font-display text-xl font-bold leading-snug text-ink">{goal}</h2>
          ) : isLoading ? (
            <div className="mt-2 space-y-2">
              <div className="skeleton h-5 w-4/5 rounded" />
              <div className="skeleton h-3 w-2/5 rounded" />
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink-3">ゴールは未設定です。</p>
          )}
          {hasGoal && (
            <p className="tabular mt-1.5 flex items-center gap-1.5 text-xs text-ink-2">
              <LinkIcon size={13} />
              {isLoading && numOfReferer === 0 ? (
                <span className="skeleton inline-block h-3 w-24 rounded align-middle" aria-label="被リンク数を取得中" />
              ) : (
                <>
                  被リンク {numOfReferer.toLocaleString()} 件{numOfReferer >= 500 ? "以上" : ""}
                </>
              )}
            </p>
          )}
        </div>
      </div>
      <Button
        className="mt-4"
        full
        size="sm"
        variant={isGoalDetailsView ? "primary" : "secondary"}
        leading={isGoalDetailsView ? <ArrowLeftIcon size={15} /> : <EyeIcon size={15} />}
        disabled={!hasGoal}
        onClick={onToggleView}
      >
        {isGoalDetailsView ? "現在の記事に戻る" : "ゴール記事を見る"}
      </Button>
    </>
  );

  if (frame === "bare") return <div>{content}</div>;

  return <section className="rounded-card border border-rule bg-paper-2 p-5 shadow-paper">{content}</section>;
};
