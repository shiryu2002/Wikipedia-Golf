import { formatTime } from "@/utils/time";
import { CalendarIcon, ClockIcon, DiceIcon, PenIcon } from "@/components/ui/Icons";

export type GameMode = "daily" | "daily-ta" | "random" | "custom" | "idle";

export const modeLabel: Record<GameMode, string> = {
  daily: "今日のお題",
  "daily-ta": "今日のお題 · タイムアタック",
  random: "ランダム",
  custom: "カスタム",
  idle: "お題を選んでください",
};

export const ModeBadge = ({ mode, compact = false }: { mode: GameMode; compact?: boolean }) => {
  const Icon =
    mode === "daily" || mode === "daily-ta" ? CalendarIcon : mode === "random" ? DiceIcon : mode === "custom" ? PenIcon : null;
  const tone =
    mode === "daily-ta"
      ? "bg-gold-soft text-gold"
      : mode === "idle"
        ? "bg-paper-3 text-ink-3"
        : "bg-green-soft text-green";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tone}`}
    >
      {Icon ? <Icon size={13} /> : null}
      {compact && mode === "daily-ta" ? "今日のお題 · TA" : modeLabel[mode]}
    </span>
  );
};

type ScorecardProps = {
  stroke: number;
  isTimeAttackMode: boolean;
  elapsedTime: number;
  mode: GameMode;
  size?: "panel" | "compact";
};

export const Scorecard = ({ stroke, isTimeAttackMode, elapsedTime, mode, size = "panel" }: ScorecardProps) => {
  const displayStroke = stroke < 0 ? 0 : stroke;
  // Remounting the numeral (key) restarts the pop animation on every change.
  const popClass = displayStroke > 0 ? "animate-pop" : "";

  if (size === "compact") {
    return (
      <div className="flex items-baseline gap-3">
        <span className="flex items-baseline gap-1">
          <span
            key={displayStroke}
            className={`tabular inline-block font-numeral text-[1.75rem] font-semibold leading-none tracking-tight text-ink ${popClass}`}
            style={{ fontVariationSettings: '"opsz" 60' }}
            aria-live="polite"
            aria-label={`打数 ${displayStroke}`}
          >
            {displayStroke}
          </span>
          <span className="text-[11px] font-semibold text-ink-3">打</span>
        </span>
        {isTimeAttackMode && (
          <span className="flex items-baseline gap-1 border-l border-rule pl-3">
            <span className="tabular font-numeral text-xl font-semibold leading-none text-ink">
              {formatTime(elapsedTime)}
            </span>
            <span className="text-[11px] font-semibold text-ink-3">秒</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-card border border-rule bg-paper-2 p-5 shadow-paper">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-3">Scorecard</p>
        <ModeBadge mode={mode} compact />
      </div>
      <div className={`mt-3 grid gap-4 ${isTimeAttackMode ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <p className="text-xs font-medium text-ink-2">打数</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span
              key={displayStroke}
              className={`tabular inline-block font-numeral text-6xl font-semibold leading-none tracking-tight text-ink ${popClass}`}
              style={{ fontVariationSettings: '"opsz" 144' }}
              aria-live="polite"
            >
              {displayStroke}
            </span>
            <span className="text-sm font-semibold text-ink-3">打</span>
          </p>
        </div>
        {isTimeAttackMode && (
          <div className="border-l border-rule pl-4">
            <p className="flex items-center gap-1 text-xs font-medium text-ink-2">
              <ClockIcon size={13} /> タイム
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span
                className="tabular font-numeral text-4xl font-semibold leading-none tracking-tight text-ink"
                style={{ fontVariationSettings: '"opsz" 96' }}
              >
                {formatTime(elapsedTime)}
              </span>
              <span className="text-sm font-semibold text-ink-3">秒</span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
