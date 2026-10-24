import { useCallback, useEffect, useState } from "react";

/** 日 / 夜兩種桌面：存在 localStorage，套在 <html data-theme> 上 */
export type Theme = "day" | "night";

const KEY = "book-theme";
const initial = (): Theme => {
  const forced = location.hash.match(/[?&]theme=(day|night)/)?.[1];
  if (forced) return forced as Theme;
  const saved = localStorage.getItem(KEY);
  if (saved === "day" || saved === "night") return saved;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
};

document.documentElement.dataset.theme = initial();

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme as Theme);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "day" ? "night" : "day";
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);
  return { theme, toggle };
}
