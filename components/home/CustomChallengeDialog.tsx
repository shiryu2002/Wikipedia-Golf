import { FormEvent, useCallback, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/router";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ArrowRightIcon, FlagIcon } from "@/components/ui/Icons";
import { Spinner } from "@/components/ui/Spinner";
import { useArticleSuggestions } from "@/hooks/useArticleSuggestions";

type Locale = "ja" | "en";

type ArticleFieldProps = {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  locale: Locale;
  autoFocus?: boolean;
  onChange: (value: string) => void;
};

/**
 * Text input with Wikipedia prefix-search suggestions (keyboard navigable).
 */
const ArticleField = ({ id, label, icon, value, placeholder, locale, autoFocus, onChange }: ArticleFieldProps) => {
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

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-ink" htmlFor={id}>
        {icon}
        {label}
      </label>
      <div
        className="relative mt-2"
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
          className="h-12 w-full rounded-xl border border-rule-2 bg-paper px-4 text-[15px] text-ink placeholder:text-ink-3 transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          data-autofocus={autoFocus ? "" : undefined}
        />
        {isLoading && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-3">
            <Spinner size={18} label="検索中" />
          </span>
        )}
        {showList && (
          <ul
            className="mt-2 w-full animate-fade-in overflow-hidden rounded-xl border border-rule bg-paper-2 shadow-paper"
            role="listbox"
            id={listId}
          >
            {suggestions.map((item, index) => (
              <li
                key={`${id}-${item}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
              >
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

type CustomChallengeDialogProps = {
  open: boolean;
  onClose: () => void;
  hintEnabled: boolean;
};

export const CustomChallengeDialog = ({ open, onClose, hintEnabled }: CustomChallengeDialogProps) => {
  const router = useRouter();
  const [startTitle, setStartTitle] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [locale, setLocale] = useState<Locale>("ja");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedStart = startTitle.trim();
      const trimmedGoal = goalTitle.trim();

      if (!trimmedStart || !trimmedGoal) {
        setError("スタートとゴールの記事名を入力してください。");
        return;
      }

      setError(null);
      setIsSubmitting(true);
      try {
        await router.push({
          pathname: "/game",
          query: {
            start: "custom",
            startTitle: trimmedStart,
            goalTitle: trimmedGoal,
            locale,
            ...(hintEnabled ? { hint: "1" } : {}),
          },
        });
        handleClose();
      } catch (err) {
        console.error("カスタムお題の開始に失敗しました", err);
        setError("お題の開始に失敗しました。時間をおいて再度お試しください。");
      } finally {
        setIsSubmitting(false);
      }
    },
    [startTitle, goalTitle, locale, hintEnabled, router, handleClose],
  );

  const isDisabled = isSubmitting || !startTitle.trim() || !goalTitle.trim();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      variant="sheet"
      size="md"
      eyebrow="Custom hole"
      title="カスタムお題を作成"
      description="スタートとゴールの記事名を入力すると、同じ条件でゲームを開始できます。URLを共有すれば友だちも同じお題で遊べます。"
      initialFocus={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="ghost" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            type="submit"
            form="custom-challenge-form"
            variant="accent"
            trailing={<ArrowRightIcon size={16} />}
            disabled={isDisabled}
          >
            {isSubmitting ? "開始中…" : "この条件で開始"}
          </Button>
        </div>
      }
    >
      <form id="custom-challenge-form" className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <span className="text-sm font-semibold text-ink">言語版</span>
          <div className="mt-2 inline-flex rounded-full border border-rule-2 bg-paper p-1 text-sm font-semibold" role="radiogroup" aria-label="言語版">
            {(["ja", "en"] as Locale[]).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={locale === option}
                onClick={() => setLocale(option)}
                className={`rounded-full px-4 py-1.5 transition ${
                  locale === option ? "bg-ink text-paper-2 shadow-sm" : "text-ink-2 hover:text-ink"
                }`}
              >
                {option === "ja" ? "日本語" : "English"}
              </button>
            ))}
          </div>
        </div>

        <ArticleField
          id="customStartTitle"
          label="スタート記事"
          icon={<span className="inline-block h-2 w-2 rounded-full bg-ink" aria-hidden />}
          value={startTitle}
          placeholder={locale === "ja" ? "例: 日本" : "e.g. Japan"}
          locale={locale}
          autoFocus
          onChange={setStartTitle}
        />

        <ArticleField
          id="customGoalTitle"
          label="ゴール記事"
          icon={<FlagIcon size={14} className="text-gold" />}
          value={goalTitle}
          placeholder={locale === "ja" ? "例: 光速" : "e.g. Speed of light"}
          locale={locale}
          onChange={setGoalTitle}
        />

        {error && (
          <p className="rounded-xl border border-rose/30 bg-rose-soft px-4 py-2.5 text-sm text-rose" role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
};
