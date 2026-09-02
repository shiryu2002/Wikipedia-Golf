type MarkProps = {
  size?: number;
  className?: string;
};

/**
 * The mark: a hole flag planted on an open book page.
 */
export const BrandMark = ({ size = 36, className = "" }: MarkProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    className={className}
    aria-hidden
    focusable={false}
  >
    <rect x="1" y="1" width="38" height="38" rx="11" className="fill-ink" />
    {/* page */}
    <path
      d="M8 29.5c4-1.6 8-1.6 12 0 4-1.6 8-1.6 12 0v2c-4-1.6-8-1.6-12 0-4-1.6-8-1.6-12 0v-2Z"
      className="fill-paper-2"
      opacity="0.9"
    />
    {/* pole */}
    <path d="M20 9v20" className="stroke-paper-2" strokeWidth="2" strokeLinecap="round" />
    {/* pennant */}
    <path d="M21 9.5h10l-2.4 3.5 2.4 3.5H21z" className="fill-green" />
    {/* ball */}
    <circle cx="13.5" cy="26.5" r="2.3" className="fill-paper-2" />
  </svg>
);

type WordmarkProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  tagline?: boolean;
};

const sizes = {
  sm: { mark: 28, text: "text-[17px]", tag: "text-[11px]" },
  md: { mark: 36, text: "text-xl", tag: "text-xs" },
  lg: { mark: 48, text: "text-3xl sm:text-4xl", tag: "text-sm" },
};

export const Wordmark = ({ size = "md", className = "", tagline = false }: WordmarkProps) => {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <BrandMark size={s.mark} className="shrink-0 drop-shadow-sm" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={`font-numeral font-semibold tracking-tight text-ink ${s.text}`} style={{ fontVariationSettings: '"opsz" 72' }}>
          Wikipedia <span className="italic text-green">Golf</span>
        </span>
        {tagline && (
          <span className={`mt-1.5 font-display text-ink-2 ${s.tag}`}>知識の海で、最短ルートを描こう。</span>
        )}
      </span>
    </span>
  );
};
