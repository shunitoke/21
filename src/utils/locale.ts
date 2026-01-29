import type { Locale } from "@/lib/types";

export const detectSystemLocale = (): Locale => {
  if (typeof window === "undefined") return "ru";
  const browserLang = navigator.language || navigator.languages?.[0] || "ru";
  if (browserLang.startsWith("ru")) return "ru";
  if (browserLang.startsWith("en")) return "en";
  return "ru";
};

export const getInitialLocale = (savedLocale?: Locale): Locale => {
  if (savedLocale) return savedLocale;
  return detectSystemLocale();
};
