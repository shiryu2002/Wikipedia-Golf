import { useEffect } from "react";

/**
 * Registers /sw.js in production builds. Registration is deferred until the
 * page has loaded so it never competes with first paint.
 */
export const useServiceWorker = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("Service worker の登録に失敗しました", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
};
