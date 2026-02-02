"use client";

import { useState, useEffect, useMemo } from "react";
import type { Locale } from "@/lib/types";

interface Quote {
  ru: string;
  en: string;
  author: string;
}

interface QuoteRotatorProps {
  locale: Locale;
}

export function QuoteRotator({ locale }: QuoteRotatorProps) {
  const quotes = useMemo<Quote[]>(
    () => [
      {
        ru: "Дисциплина — это выбор между тем, чего ты хочешь сейчас, и тем, чего хочешь больше всего.",
        en: "Discipline is choosing between what you want now and what you want most.",
        author: "Abraham Lincoln",
      },
      {
        ru: "Мы — то, что мы делаем регулярно. Совершенство — не действие, а привычка.",
        en: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
        author: "Aristotle",
      },
      {
        ru: "Маленький шаг сегодня важнее, чем идеальный план завтра.",
        en: "A small step today is better than a perfect plan tomorrow.",
        author: "Anonymous",
      },
      {
        ru: "Успех — это сумма небольших усилий, повторяемых изо дня в день.",
        en: "Success is the sum of small efforts repeated day in and day out.",
        author: "Robert Collier",
      },
      {
        ru: "Сначала мы формируем привычки, затем привычки формируют нас.",
        en: "First we make our habits, then our habits make us.",
        author: "John Dryden",
      },
      {
        ru: "То, что делаешь каждый день, важнее того, что делаешь иногда.",
        en: "What you do every day matters more than what you do occasionally.",
        author: "Gretchen Rubin",
      },
      {
        ru: "Терпение и время делают больше, чем сила или страсть.",
        en: "Patience and time do more than strength or passion.",
        author: "Jean de La Fontaine",
      },
      {
        ru: "Мотивация ведёт к началу, привычка — к результату.",
        en: "Motivation gets you started. Habit keeps you going.",
        author: "Jim Ryun",
      },
    ],
    []
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (document.querySelector('[data-slot="dialog-overlay"], [data-slot="alert-dialog-overlay"]')) return;
    setIndex((prev) => (quotes.length ? (prev + 1) % quotes.length : 0));
  }, [quotes.length]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.querySelector('[data-slot="dialog-overlay"], [data-slot="alert-dialog-overlay"]')) return;
      setIndex((prev) => (quotes.length ? (prev + 1) % quotes.length : 0));
    }, 15000);
    return () => window.clearInterval(interval);
  }, [quotes.length]);

  const quote = quotes[index] ?? quotes[0];

  return (
    <>
      <p className="text-sm italic text-muted-foreground">"{locale === "ru" ? quote.ru : quote.en}"</p>
      <p className="text-xs text-muted-foreground">— {quote.author}</p>
    </>
  );
}
