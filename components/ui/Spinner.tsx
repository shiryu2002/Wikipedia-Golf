type SpinnerProps = {
  size?: number;
  className?: string;
  label?: string;
};

/**
 * A golf-ball spinner: a ring that "rolls" around a dimpled ball.
 */
export const Spinner = ({ size = 40, className = "", label = "読み込み中" }: SpinnerProps) => (
  <span
    role="status"
    aria-label={label}
    className={`relative inline-flex items-center justify-center ${className}`}
    style={{ width: size, height: size }}
  >
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className="absolute inset-0 animate-[spin_1.1s_linear_infinite]"
      aria-hidden
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="3"
      />
      <path
        d="M20 4a16 16 0 0 1 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
    <svg viewBox="0 0 40 40" width={size * 0.5} height={size * 0.5} aria-hidden>
      <circle cx="20" cy="20" r="14" fill="currentColor" opacity="0.12" />
      <circle cx="15" cy="15" r="1.4" fill="currentColor" opacity="0.5" />
      <circle cx="22" cy="13" r="1.4" fill="currentColor" opacity="0.5" />
      <circle cx="25" cy="20" r="1.4" fill="currentColor" opacity="0.5" />
      <circle cx="18" cy="22" r="1.4" fill="currentColor" opacity="0.5" />
      <circle cx="14" cy="26" r="1.4" fill="currentColor" opacity="0.5" />
      <circle cx="23" cy="27" r="1.4" fill="currentColor" opacity="0.5" />
    </svg>
  </span>
);
