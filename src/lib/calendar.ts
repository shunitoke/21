import type { Locale } from "@/lib/types";

export const getMonthLabel = (date: Date, locale: Locale) =>
  date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "long", year: "numeric" });

export const weekdaysShort = (locale: Locale) =>
  locale === "ru" ? ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
