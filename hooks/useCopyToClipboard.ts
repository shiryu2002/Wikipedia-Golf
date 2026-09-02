import { useCallback, useEffect, useRef, useState } from "react";

const legacyCopy = (text: string) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  return ok;
};

/**
 * Copies text and exposes a transient "copied" flag for button feedback.
 */
export const useCopyToClipboard = (resetAfterMs = 2000) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (!legacyCopy(text)) {
          throw new Error("execCommand copy failed");
        }
        setCopied(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), resetAfterMs);
        return true;
      } catch (error) {
        console.error("クリップボードへのコピーに失敗しました", error);
        return false;
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
};
