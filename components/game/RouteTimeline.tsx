import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { FlagIcon, UndoIcon } from "@/components/ui/Icons";

export type HistoryEntry = {
  title: string;
  url: string;
  stroke: number;
};

type RouteTimelineProps = {
  history: HistoryEntry[];
  goal: string;
  reached: boolean;
  canUndo: boolean;
  undoDisabledReason?: string;
  onUndo: () => void;
  /** Panel adds a card frame + heading; "bare" is for sheets/dialogs. */
  frame?: "panel" | "bare";
  maxHeightClass?: string;
};

export const RouteTimeline = ({
  history,
  goal,
  reached,
  canUndo,
  undoDisabledReason,
  onUndo,
  frame = "panel",
  maxHeightClass = "max-h-[44vh]",
}: RouteTimelineProps) => {
  const listRef = useRef<HTMLOListElement>(null);
  const count = history.length;

  // Keep the latest hop in view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const current = list.querySelector<HTMLElement>("[data-current='true']");
    current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [count]);

  const body = (
    <>
      {history.length === 0 ? (
        <p className="rounded-xl border border-dashed border-rule-2 px-4 py-5 text-center text-sm text-ink-3">
          スタートすると、辿ったルートがここに並びます。
        </p>
      ) : (
        <ol ref={listRef} className={`scroll-thin relative overflow-y-auto pr-1 ${maxHeightClass}`}>
          {history.map((item, index) => {
            const isStart = index === 0;
            const isCurrent = index === history.length - 1;
            const isLast = isCurrent && reached;
            return (
              <li
                key={`${item.title}-${index}`}
                data-current={isCurrent}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {/* rail connecting to the next hop (or the goal placeholder) */}
                {!(isCurrent && reached) && (
                  <span aria-hidden className="absolute left-[9px] top-5 h-[calc(100%-4px)] w-px bg-rule-2" />
                )}
                <span
                  aria-hidden
                  className={[
                    "relative z-[1] mt-1 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2",
                    isLast
                      ? "border-green bg-green text-white"
                      : isCurrent
                        ? "border-green bg-paper-2 text-green"
                        : isStart
                          ? "border-ink bg-ink"
                          : "border-rule-2 bg-paper-2",
                  ].join(" ")}
                >
                  {isLast ? (
                    <FlagIcon size={11} strokeWidth={2.4} />
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-green" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1 animate-fade-up">
                  <p className="tabular text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">
                    {isStart ? "Start" : `${item.stroke} 打目`}
                  </p>
                  <p
                    className={`mt-0.5 break-words text-[15px] leading-snug ${
                      isCurrent ? "font-semibold text-ink" : "text-ink-2"
                    }`}
                  >
                    {item.title}
                  </p>
                </div>
              </li>
            );
          })}
          {!reached && goal && (
            <li className="relative flex gap-3 pt-0">
              <span
                aria-hidden
                className="relative z-[1] mt-1 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gold/70 bg-paper-2 text-gold"
              >
                <FlagIcon size={11} strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Goal</p>
                <p className="mt-0.5 break-words text-[15px] leading-snug text-ink-2">{goal}</p>
              </div>
            </li>
          )}
        </ol>
      )}
    </>
  );

  if (frame === "bare") {
    return (
      <div>
        {body}
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-3">{undoDisabledReason && !canUndo ? undoDisabledReason : " "}</p>
          <Button size="sm" variant="secondary" leading={<UndoIcon size={15} />} disabled={!canUndo} onClick={onUndo}>
            1手戻す
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-card border border-rule bg-paper-2 p-5 shadow-paper">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-3">Route</p>
          <h2 className="mt-0.5 font-display text-lg font-bold leading-tight">辿ったルート</h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          leading={<UndoIcon size={15} />}
          disabled={!canUndo}
          onClick={onUndo}
          title={!canUndo && undoDisabledReason ? undoDisabledReason : undefined}
        >
          1手戻す
        </Button>
      </div>
      {body}
    </section>
  );
};
