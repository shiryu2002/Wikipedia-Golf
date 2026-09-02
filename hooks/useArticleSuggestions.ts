import { useEffect, useState } from "react";

/**
 * Debounced Wikipedia prefix search used by the custom-challenge form.
 */
export const useArticleSuggestions = (
  query: string,
  locale: "en" | "ja",
  isActive: boolean,
) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const debounceId = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          action: "query",
          list: "prefixsearch",
          pssearch: trimmed,
          pslimit: "6",
          format: "json",
          origin: "*",
        });
        const endpoint = `https://${locale}.wikipedia.org/w/api.php?${params.toString()}`;
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch prefix search for ${trimmed}`);
        }
        const data = await response.json();
        const resultItems: string[] = Array.isArray(data?.query?.prefixsearch)
          ? data.query.prefixsearch
              .map((item: { title?: string }) => item?.title)
              .filter((title: string | undefined): title is string => Boolean(title))
          : [];
        setSuggestions(resultItems);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("記事サジェストの取得に失敗しました", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(debounceId);
      setIsLoading(false);
    };
  }, [query, locale, isActive]);

  return { suggestions, isLoading };
};
