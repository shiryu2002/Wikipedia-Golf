import { useMemo, useState } from "react";
import { BulbIcon } from "@/components/ui/Icons";

type HintsPanelProps = {
  hints: string[];
  isLoading?: boolean;
  frame?: "panel" | "bare";
  maxHeightClass?: string;
};

/**
 * Backlinks of the goal article — the pages that link to it. Any one of
 * them is one hop from the hole.
 */
export const HintsPanel = ({ hints, isLoading = false, frame = "panel", maxHeightClass = "max-h-72" }: HintsPanelProps) => {
  const [filter, setFilter] = useState("");
  const hasHints = Array.isArray(hints) && hints.length > 0;

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return hints;
    return hints.filter((hint) => hint.toLowerCase().includes(q));
  }, [hints, filter]);

  const body = (
    <>
      <p className="text-sm leading-relaxed text-ink-2">
        ゴール記事にリンクしている記事の一覧です。ここにある記事に着けば、あと1打でゴールできます。
      </p>
      {hasHints && (
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={`${hints.length.toLocaleString()} 件から絞り込む…`}
          className="mt-3 h-10 w-full rounded-xl border border-rule bg-paper px-3.5 text-sm text-ink placeholder:text-ink-3 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
          aria-label="ヒントを絞り込む"
        />
      )}
      <div className={`scroll-thin mt-3 overflow-y-auto pr-1 ${maxHeightClass}`}>
        {hasHints ? (
          visible.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {visible.map((hint, index) => (
                <li
                  key={`${hint}-${index}`}
                  className="rounded-lg border border-rule bg-paper px-2.5 py-1 text-[13px] leading-snug text-ink-2"
                >
                  {hint}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-ink-3">一致するヒントはありません。</p>
          )
        ) : isLoading ? (
          <div className="space-y-2 py-1" aria-label="ヒントを取得中">
            <div className="skeleton h-7 w-full rounded-lg" />
            <div className="skeleton h-7 w-5/6 rounded-lg" />
            <div className="skeleton h-7 w-2/3 rounded-lg" />
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-ink-3">ヒントはまだありません。</p>
        )}
      </div>
    </>
  );

  if (frame === "bare") return <div>{body}</div>;

  return (
    <section className="rounded-card border border-gold/30 bg-paper-2 p-5 shadow-paper">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-soft text-gold">
          <BulbIcon size={16} />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Hints</p>
          <h2 className="font-display text-lg font-bold leading-tight">ゴールのリンク元</h2>
        </div>
      </div>
      {body}
    </section>
  );
};
