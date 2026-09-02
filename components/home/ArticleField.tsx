import { useState, type KeyboardEvent, type ReactNode } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { useArticleSuggestions } from "@/hooks/useArticleSuggestions";

type Locale = "ja" | "en";

type ArticleFieldProps = {
  id: string;
  label: string;
  icon?: ReactNode;
  value: string;
  placeholder: string;
  locale: Locale;
  autoFocus?: boolean;
  /** Visually hide the label (still announced to screen readers). */
  hideLabel?: boolean;
  /** "plain" renders a bare, larger input for use inside the hole board. */
  appearance?: "boxed" | "plain";
  onChange: (value: string) => void;
};

/**
 * Text input with Wikipedia prefix-search suggestions (keyboard navigable).
 */
export const ArticleField = ({
  id,
  label,
  icon,
  value,
  placeholder,
  locale,
  autoFocus,
  hideLabel = false,
  appearance = "boxed",
  onChange,
}: ArticleFieldProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { suggestions, isLoading } = useArticleSuggestions(value, locale, open);
  const listId = `${id}-suggestions`;
  const showList = open && suggestions.length > 0;

  const select = (item: string) => {
    onChange(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      select(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
    }
  };

  const inputClasses =
    appearance === "plain"
      ? "h-12 w-full border-0 border-b-2 border-rule-2 bg-transparent px-0 font-display text-2xl font-bold text-ink placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-ink-3 transition focus:border-green focus:outline-none"
      : "h-12 w-full rounded-xl border border-rule-2 bg-paper px-4 text-[15px] text-ink placeholder:text-ink-3 transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25";

  return (
    <div>
      <label className={hideLabel ? "sr-only" : "flex items-center gap-1.5 text-sm font-semibold text-ink"} htmlFor={id}>
        {icon}
        {label}
      </label>
      <div
        className={hideLabel ? "relative" : "relative mt-2"}
        role="combobox"
        aria-expanded={showList}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-owns={listId}
      >
        <input
          id={id}
          name={id}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className={inputClasses}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          data-autofocus={autoFocus ? "" : undefined}
        />
        {isLoading && (
          <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-ink-3">
            <Spinner size={18} label="検索中" />
          </span>
        )}
        {showList && (
          <ul
            className="absolute left-0 right-0 z-20 mt-2 animate-fade-in overflow-hidden rounded-xl border border-rule bg-paper-2 shadow-paper-lg"
            role="listbox"
            id={listId}
          >
            {suggestions.map((item, index) => (
              <li key={`${id}-${item}`} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                    index === activeIndex ? "bg-green-soft text-ink" : "text-ink-2 hover:bg-paper-3/70 hover:text-ink"
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                >
                  <span className="truncate">{item}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
