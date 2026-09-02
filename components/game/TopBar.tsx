import { BrandMark, Wordmark } from "@/components/Brand";
import { Button, IconButton } from "@/components/ui/Button";
import { BulbIcon, CheckIcon, FlagIcon, LinkIcon } from "@/components/ui/Icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Scorecard, type GameMode } from "./Scorecard";

type TopBarProps = {
  startTitle: string;
  goalTitle: string;
  stroke: number;
  elapsedTime: number;
  isTimeAttackMode: boolean;
  mode: GameMode;
  isHintEnabled: boolean;
  isHintOpen: boolean;
  onToggleHints: () => void;
  showShareUrl: boolean;
  isUrlCopied: boolean;
  onCopyUrl: () => void;
  canToggleGoal: boolean;
  isGoalDetailsView: boolean;
  onToggleGoal: () => void;
  onReturnToTitle: () => void;
};

export const TopBar = ({
  startTitle,
  goalTitle,
  stroke,
  elapsedTime,
  isTimeAttackMode,
  mode,
  isHintEnabled,
  isHintOpen,
  onToggleHints,
  showShareUrl,
  isUrlCopied,
  onCopyUrl,
  canToggleGoal,
  isGoalDetailsView,
  onToggleGoal,
  onReturnToTitle,
}: TopBarProps) => (
  <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur-md">
    <div className="mx-auto flex h-14 max-w-shell items-center gap-3 px-4 sm:h-16 sm:px-6">
      <button
        type="button"
        onClick={onReturnToTitle}
        className="shrink-0 rounded-xl transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
        aria-label="タイトルに戻る"
        title="タイトルに戻る"
      >
        <span className="hidden lg:block">
          <Wordmark size="sm" />
        </span>
        <span className="lg:hidden">
          <BrandMark size={32} />
        </span>
      </button>

      {/* Start → Goal (desktop). Goal is tappable to peek at the article. */}
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex">
        <span className="flex min-w-0 max-w-[16rem] items-center gap-2 rounded-full border border-rule bg-paper-2 px-3 py-1.5 text-[13px]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Start</span>
          <span className="truncate font-medium text-ink">{startTitle}</span>
        </span>
        <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden className="shrink-0 text-rule-2">
          <path d="M0 5h24M20 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <button
          type="button"
          onClick={onToggleGoal}
          disabled={!canToggleGoal}
          className={[
            "flex min-w-0 max-w-[16rem] items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition",
            isGoalDetailsView
              ? "border-gold/60 bg-gold-soft text-ink"
              : "border-rule bg-paper-2 text-ink hover:border-gold/60 hover:bg-gold-soft/60",
            "disabled:cursor-default disabled:hover:border-rule disabled:hover:bg-paper-2",
          ].join(" ")}
          title={canToggleGoal ? (isGoalDetailsView ? "現在の記事に戻る" : "ゴール記事を見る") : undefined}
        >
          <FlagIcon size={13} className="shrink-0 text-gold" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">Goal</span>
          <span className="truncate font-medium">{goalTitle}</span>
        </button>
      </div>

      {/* Compact scorecard (mobile/tablet) */}
      <div className="flex min-w-0 flex-1 items-center justify-center lg:hidden">
        <Scorecard stroke={stroke} elapsedTime={elapsedTime} isTimeAttackMode={isTimeAttackMode} mode={mode} size="compact" />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {isHintEnabled && (
          <>
            <Button
              size="sm"
              variant={isHintOpen ? "primary" : "secondary"}
              leading={<BulbIcon size={15} />}
              onClick={onToggleHints}
              className="hidden lg:inline-flex"
              aria-pressed={isHintOpen}
            >
              ヒント
            </Button>
          </>
        )}
        {showShareUrl && (
          <>
            <Button
              size="sm"
              variant="secondary"
              leading={isUrlCopied ? <CheckIcon size={15} className="text-green" /> : <LinkIcon size={15} />}
              onClick={onCopyUrl}
              className="hidden lg:inline-flex"
            >
              {isUrlCopied ? "コピーしました" : "URLを共有"}
            </Button>
            <IconButton
              label={isUrlCopied ? "コピーしました" : "URLを共有"}
              size="sm"
              tone="quiet"
              onClick={onCopyUrl}
              className="lg:hidden"
            >
              {isUrlCopied ? <CheckIcon size={18} className="text-green" /> : <LinkIcon size={18} />}
            </IconButton>
          </>
        )}
        <ThemeToggle />
      </div>
    </div>
  </header>
);
