import { useCallback, useSyncExternalStore } from "react";
import { IconButton } from "./Button";
import { MoonIcon, SunIcon } from "./Icons";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "wg-theme";

/**
 * Inline script for _document: applies the stored (or system) theme
 * before first paint so there is no flash.
 */
export const themeInitScript = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=(s==="dark"||s==="light")?s:(m?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

const readTheme = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

const readStoredTheme = (): Theme | null => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
};

const applyTheme = (next: Theme) => {
  document.documentElement.setAttribute("data-theme", next);
};

/** Subscribe to the data-theme attribute and, while the user hasn't chosen
 *  explicitly, to the OS color-scheme preference. */
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMediaChange = (event: MediaQueryListEvent) => {
    if (readStoredTheme()) return;
    applyTheme(event.matches ? "dark" : "light");
  };
  media.addEventListener?.("change", onMediaChange);

  return () => {
    observer.disconnect();
    media.removeEventListener?.("change", onMediaChange);
  };
};

const getServerSnapshot = (): Theme => "light";

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme(readTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, toggle, setTheme };
};

export const ThemeToggle = ({ tone = "quiet" }: { tone?: "quiet" | "default" }) => {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <IconButton
      label={isDark ? "ライトテーマに切り替え" : "ダークテーマに切り替え"}
      tone={tone}
      size="sm"
      onClick={toggle}
    >
      <span className="relative block h-[18px] w-[18px]">
        <SunIcon
          size={18}
          className={`absolute inset-0 transition-[opacity,transform] duration-300 ${isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        />
        <MoonIcon
          size={18}
          className={`absolute inset-0 transition-[opacity,transform] duration-300 ${isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`}
        />
      </span>
    </IconButton>
  );
};
