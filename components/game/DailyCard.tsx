import { Button } from "@/components/ui/Button";
import { ArrowRightIcon, CalendarIcon, FlagIcon } from "@/components/ui/Icons";
import type { DailyChallenge } from "@/useCase/dailyChallenge";

type DailyCardProps = {
  challenge: DailyChallenge | null;
  isActive: boolean;
  onStart: () => void;
  frame?: "panel" | "bare";
};

export const formatJaDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map((part) => Number(part));
  if (!y || !m || !d) return iso;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, d).getDay()];
  return `${m}月${d}日（${weekday}）`;
};

export const DailyCard = ({ challenge, isActive, onStart, frame = "panel" }: DailyCardProps) => {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-green">
          <CalendarIcon size={13} /> Today&apos;s Hole
        </p>
        {challenge?.date && <p className="text-xs text-ink-2">{formatJaDate(challenge.date)}</p>}
      </div>
      {challenge ? (
        <dl className="mt-3 space-y-2">
          <div className="flex items-baseline gap-2">
            <dt className="w-12 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Start</dt>
            <dd className="min-w-0 break-words font-display text-[15px] font-bold leading-snug">{challenge.start.title}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="w-12 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gold">Goal</dt>
            <dd className="min-w-0 flex items-start gap-1.5 break-words font-display text-[15px] font-bold leading-snug">
              <FlagIcon size={14} className="mt-1 shrink-0 text-gold" />
              {challenge.goal.title}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
        </div>
      )}
      {isActive ? (
        <p className="mt-4 rounded-xl bg-green-soft px-3 py-2 text-center text-xs font-semibold text-green">
          このお題をプレイ中
        </p>
      ) : (
        <Button
          className="mt-4"
          full
          size="sm"
          variant="accent"
          trailing={<ArrowRightIcon size={15} />}
          disabled={!challenge}
          onClick={onStart}
        >
          このお題でスタート
        </Button>
      )}
    </>
  );

  if (frame === "bare") return <div>{inner}</div>;

  return (
    <section className="rounded-card border border-green/25 bg-gradient-to-b from-green-soft/70 to-paper-2 p-5 shadow-paper">
      {inner}
    </section>
  );
};
