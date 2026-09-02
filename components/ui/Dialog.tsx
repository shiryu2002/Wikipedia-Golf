import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./Button";
import { CloseIcon } from "./Icons";

type DialogProps = {
  open: boolean;
  onClose?: () => void;
  /** "center" always centers; "sheet" slides up from the bottom on small
   *  screens and centers on larger ones. */
  variant?: "center" | "sheet";
  size?: "sm" | "md" | "lg";
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Whether clicking the backdrop dismisses. Defaults to true. */
  dismissible?: boolean;
  showClose?: boolean;
  /** Extra classes for the panel. */
  className?: string;
  /** Prevent the initial auto-focus (e.g. when there's an autoFocus input). */
  initialFocus?: boolean;
  /** Sheet variant only: take the whole screen on phones instead of a bottom sheet. */
  mobileFull?: boolean;
};

const sizeClasses = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

let lockCount = 0;

const lockScroll = () => {
  if (typeof document === "undefined") return () => {};
  lockCount += 1;
  const { body } = document;
  const previous = body.style.overflow;
  body.style.overflow = "hidden";
  return () => {
    lockCount -= 1;
    if (lockCount <= 0) {
      body.style.overflow = previous;
      lockCount = 0;
    }
  };
};

export const Dialog = ({
  open,
  onClose,
  variant = "sheet",
  size = "md",
  title,
  eyebrow,
  description,
  children,
  footer,
  dismissible = true,
  showClose = true,
  className = "",
  initialFocus = true,
  mobileFull = false,
}: DialogProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = (document.activeElement as HTMLElement | null) ?? null;
    const unlock = lockScroll();

    if (initialFocus) {
      // Focus the first focusable control, else the panel itself.
      const frame = window.requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const first = panel.querySelector<HTMLElement>(
          '[data-autofocus], input, textarea, select, button:not([data-dialog-close]), a[href]',
        );
        (first ?? panel).focus({ preventScroll: true });
      });
      return () => {
        window.cancelAnimationFrame(frame);
        unlock();
        previouslyFocused.current?.focus?.({ preventScroll: true });
      };
    }

    return () => {
      unlock();
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [open, initialFocus]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible && onClose) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "Tab" && panelRef.current) {
        // Simple focus trap.
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  const isSheet = variant === "sheet";
  const isFull = isSheet && mobileFull;

  const panelShape = isFull
    ? "animate-fade-in h-[100dvh] max-h-[100dvh] rounded-none border-0 pt-[env(safe-area-inset-top,0px)] sm:h-auto sm:max-h-[min(92dvh,56rem)] sm:animate-scale-in sm:rounded-card sm:border sm:pt-0"
    : isSheet
      ? "max-h-[min(92dvh,56rem)] animate-sheet-up rounded-t-[1.5rem] border sm:animate-scale-in sm:rounded-card"
      : "max-h-[min(92dvh,56rem)] animate-scale-in rounded-card border";

  return (
    <div
      className={[
        "fixed inset-0 z-[100] flex justify-center",
        isSheet ? "items-end sm:items-center sm:p-4" : "items-center p-4",
      ].join(" ")}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-ink/45 backdrop-blur-[3px] dark:bg-black/60"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={[
          "relative flex w-full flex-col overflow-hidden border-rule bg-paper-2 text-ink shadow-paper-lg outline-none",
          panelShape,
          sizeClasses[size],
          className,
        ].join(" ")}
      >
        {isSheet && !isFull && (
          <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-rule-2" />
          </div>
        )}
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-5 sm:px-7 sm:pt-6">
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-green">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 id={titleId} className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descId} className="mt-2 text-sm leading-relaxed text-ink-2">
                  {description}
                </p>
              ) : null}
            </div>
            {showClose && onClose ? (
              <IconButton label="閉じる" tone="quiet" size="sm" onClick={onClose} data-dialog-close className="-mr-2 -mt-1">
                <CloseIcon size={18} />
              </IconButton>
            ) : null}
          </div>
        )}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-rule bg-paper-2 px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-7">{footer}</div>
        ) : (
          <div className="pb-safe" />
        )}
      </div>
    </div>
  );
};
