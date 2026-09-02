import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LinkProps } from "next/link";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "paper";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  // Ink on paper — the default "serious" action.
  primary:
    "bg-ink text-paper-2 shadow-lift hover:bg-ink/90 active:translate-y-px disabled:bg-ink/30 disabled:text-paper-2/80 disabled:shadow-none",
  // Fairway green — the one CTA per screen that starts play.
  accent:
    "bg-green text-white shadow-lift hover:bg-green-2 active:translate-y-px disabled:bg-green/35 disabled:shadow-none",
  // Hairline outline on paper.
  secondary:
    "border border-rule-2 bg-paper-2 text-ink hover:border-ink/40 hover:bg-paper-3/60 active:translate-y-px disabled:text-ink-3 disabled:border-rule disabled:bg-transparent",
  ghost:
    "text-ink-2 hover:bg-ink/[0.06] hover:text-ink active:translate-y-px disabled:text-ink-3 disabled:hover:bg-transparent",
  danger:
    "border border-rose/40 bg-rose-soft text-rose hover:border-rose/70 active:translate-y-px disabled:opacity-50",
  // White-on-dark-green surfaces (e.g. inside the daily ticket).
  paper:
    "bg-paper-2 text-ink shadow-lift hover:bg-white active:translate-y-px disabled:bg-paper-2/60 disabled:text-ink-3 disabled:shadow-none",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-full",
  md: "h-11 px-5 text-sm gap-2 rounded-full",
  lg: "h-[3.25rem] px-7 text-base gap-2.5 rounded-full",
};

export const buttonClasses = (
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  extra = "",
) =>
  [
    "inline-flex items-center justify-center whitespace-nowrap font-semibold tracking-[0.01em] select-none",
    "transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out",
    "disabled:cursor-not-allowed disabled:active:translate-y-0",
    variantClasses[variant],
    sizeClasses[size],
    extra,
  ].join(" ");

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  full?: boolean;
};

export const Button = ({
  variant = "secondary",
  size = "md",
  leading,
  trailing,
  full,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={buttonClasses(variant, size, `${full ? "w-full" : ""} ${className}`)}
    {...rest}
  >
    {leading ? <span className="-ml-0.5 shrink-0">{leading}</span> : null}
    <span className="truncate">{children}</span>
    {trailing ? <span className="-mr-0.5 shrink-0">{trailing}</span> : null}
  </button>
);

type ButtonLinkProps = Omit<LinkProps, "href"> & {
  href: LinkProps["href"];
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  full?: boolean;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
  target?: string;
  rel?: string;
  "aria-label"?: string;
};

export const ButtonLink = ({
  variant = "secondary",
  size = "md",
  leading,
  trailing,
  full,
  className = "",
  children,
  disabled,
  href,
  ...rest
}: ButtonLinkProps) => {
  const classes = buttonClasses(
    variant,
    size,
    `${full ? "w-full" : ""} ${disabled ? "pointer-events-none opacity-50" : ""} ${className}`,
  );
  return (
    <Link href={href} className={classes} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : undefined} {...rest}>
      {leading ? <span className="-ml-0.5 shrink-0">{leading}</span> : null}
      <span className="truncate">{children}</span>
      {trailing ? <span className="-mr-0.5 shrink-0">{trailing}</span> : null}
    </Link>
  );
};

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "sm" | "md";
  tone?: "default" | "quiet";
};

export const IconButton = ({
  label,
  size = "md",
  tone = "default",
  className = "",
  children,
  type = "button",
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={[
      "inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:translate-y-px",
      size === "sm" ? "h-9 w-9" : "h-10 w-10",
      tone === "quiet"
        ? "text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
        : "border border-rule-2 bg-paper-2 text-ink hover:border-ink/40 hover:bg-paper-3/60",
      "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0",
      className,
    ].join(" ")}
    {...rest}
  >
    {children}
  </button>
);
