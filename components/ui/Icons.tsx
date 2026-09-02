import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number | undefined, props: IconProps) => ({
  width: size ?? 20,
  height: size ?? 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  ...props,
});

export const FlagIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 3.5 2 3.5H5" fill="currentColor" stroke="none" opacity={0.9} />
    <path d="M5 4h11l-2 3.5 2 3.5H5" />
  </svg>
);

export const BallIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="9.5" cy="9.5" r="0.6" fill="currentColor" />
    <circle cx="13.5" cy="8.5" r="0.6" fill="currentColor" />
    <circle cx="14.5" cy="12.5" r="0.6" fill="currentColor" />
    <circle cx="10.5" cy="13.5" r="0.6" fill="currentColor" />
  </svg>
);

export const ArrowRightIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

export const ArrowLeftIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M19 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </svg>
);

export const UndoIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

export const LinkIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

export const CopyIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);

export const CheckIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const CloseIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </svg>
);

export const MenuIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
);

export const RouteIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8.5 6H14a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-4a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3h5.5" />
  </svg>
);

export const EyeIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const BulbIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
  </svg>
);

export const ShareIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 3v12" />
    <path d="M8 7l4-4 4 4" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);

export const DiceIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <circle cx="9" cy="15" r="1" fill="currentColor" />
    <circle cx="15" cy="15" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const CalendarIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </svg>
);

export const ClockIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const PenIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
    <path d="M13.5 7.5l3 3" />
  </svg>
);

export const SunIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2" />
    <path d="M12 19.5v2" />
    <path d="M4.9 4.9l1.4 1.4" />
    <path d="M17.7 17.7l1.4 1.4" />
    <path d="M2.5 12h2" />
    <path d="M19.5 12h2" />
    <path d="M4.9 19.1l1.4-1.4" />
    <path d="M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

export const HomeIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v10h12V10" />
  </svg>
);

export const RefreshIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </svg>
);

export const ChevronDownIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const GitHubIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)} stroke="none" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.36 6.84 9.72.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49C19.14 20.6 22 16.76 22 12.24 22 6.58 17.52 2 12 2Z" />
  </svg>
);

export const SparkleIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
  </svg>
);

export const TrophyIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 6H5.5a2 2 0 0 0 0 4H8" />
    <path d="M16 6h2.5a2 2 0 0 1 0 4H16" />
    <path d="M12 13v4" />
    <path d="M8.5 20h7" />
    <path d="M10 17h4v3h-4z" />
  </svg>
);

export const InfoIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8" r="0.7" fill="currentColor" />
  </svg>
);

export const ExternalIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);
