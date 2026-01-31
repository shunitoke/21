"use client";

import type { Variants } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Achievement, Habit, HabitLog, JournalEntry, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { getPastDays } from "@/lib/date";
import { getCategoryMeta, habitCategories } from "@/lib/categories";
import { weekdaysShort } from "@/lib/calendar";
import AudioAnchor from "@/components/AudioAnchor";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Carousel, type CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { TooltipProps } from "recharts";
import { Area, CartesianGrid, ComposedChart, PolarAngleAxis, RadialBar, RadialBarChart, XAxis, YAxis } from "recharts";
import { NotebookPen, TrendingDown, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProgressScreenProps {
  locale: Locale;
  habits: Habit[];
  logs: HabitLog[];
  achievements: Achievement[];
  journal: JournalEntry[];
  isActive?: boolean;
}

const emotionLabels: Record<string, { ru: string; en: string }> = {
  спокойствие: { ru: "Спокойствие", en: "Calm" },
  энергия: { ru: "Энергия", en: "Energy" },
  благодарность: { ru: "Благодарность", en: "Gratitude" },
  любовь: { ru: "Любовь", en: "Love" },
  гордость: { ru: "Гордость", en: "Pride" },
  уверенность: { ru: "Уверенность", en: "Confidence" },
  фокус: { ru: "Фокус", en: "Focus" },
  вдохновение: { ru: "Вдохновение", en: "Inspiration" },
  тревога: { ru: "Тревога", en: "Anxiety" },
  грусть: { ru: "Грусть", en: "Sadness" },
};

const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));

  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return isVisible;
};

const useCountUp = (value: number, duration = 900, enabled = true) => {
  const [displayValue, setDisplayValue] = useState(0);
  const latestValueRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      latestValueRef.current = value;
      setDisplayValue(value);
      return;
    }
    let rafId = 0;
    const start = performance.now();
    const from = latestValueRef.current;
    const delta = value - from;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + delta * eased);
      latestValueRef.current = next;
      setDisplayValue(next);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, value, duration]);

  return displayValue;
};

const CountUpValue = ({ value, suffix, enabled = true }: { value: number; suffix?: string; enabled?: boolean }) => {
  const animated = useCountUp(value, 900, enabled);
  return (
    <span className="tabular-nums">
      {animated.toLocaleString()}
      {suffix ?? ""}
    </span>
  );
};

const getAchievementBadge = (achievement: Achievement, locale: Locale) => {
  const isLegendary =
    achievement.id === "achievement-365" ||
    achievement.id === "achievement-master" ||
    achievement.id.includes("legendary");
  const isRare = achievement.id.includes("rare") || isLegendary;
  return {
    show: achievement.habitId ? isRare : false,
    isLegendary,
    label: isLegendary ? t("legendaryAchievement", locale) : t("rareAchievement", locale),
    variant: isLegendary ? ("default" as const) : ("secondary" as const),
  };
};

const AchievementCard = ({ achievement, locale }: { achievement: Achievement; locale: Locale }) => {
  const badge = getAchievementBadge(achievement, locale);

  return (
    <div key={achievement.id} className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">{achievementGlyphs[achievement.id] ?? "⭐"}</span>
        <div className="grid gap-1">
          <p className="text-sm font-semibold">{achievement.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            {badge.show && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>
        </div>
      </div>
      {achievement.dateUnlocked && (
        <span className="text-xs text-muted-foreground">
          {new Date(achievement.dateUnlocked).toLocaleDateString(
            locale === "ru" ? "ru-RU" : "en-US",
            { day: "numeric", month: "short", year: "numeric" }
          )}
        </span>
      )}
    </div>
  );
};

const AchievementGroup = ({
  title,
  achievements,
  locale,
}: {
  title: string;
  achievements: Achievement[];
  locale: Locale;
}) => (
  <div className="grid gap-3">
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
    <div className="grid gap-4">
      {achievements.map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} locale={locale} />
      ))}
    </div>
  </div>
);

const mixColors = (colors: string[]) => {
  const validColors = colors.filter(Boolean);
  if (!validColors.length) return null;
  if (validColors.length === 1) return validColors[0];
  return validColors.reduce((mixed, color) => `color-mix(in hsl, ${mixed} 50%, ${color} 50%)`);
};

const achievementGlyphs: Record<string, string> = {
  "achievement-first-habit": "🌱",
  "achievement-five-habits": "🌿",
  "achievement-all-categories": "🌍",
  "achievement-priority-five": "🎯",
  "achievement-first-entry": "📝",
  "achievement-week-journal": "📓",
  "achievement-month-journal": "📚",
  "achievement-audio-master": "🎙️",
  "achievement-first-steps": "🌟",
  "achievement-consistent": "💪",
  "achievement-hundred": "🎖️",
  "achievement-dedicated": "🏅",
  "achievement-master": "🏆",
  "achievement-365": "🌈",
};

const metricCardVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      delay: index * 0.08,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

type ChartPoint = Record<string, number | string | JournalEntry[]> & {
  label: string;
  date: string;
  entries: JournalEntry[];
  marker: number;
};

type JournalDotPayload = {
  entries?: JournalEntry[];
  onClick?: (entries: JournalEntry[]) => void;
};

const getLogPoints = (log?: HabitLog) => {
  if (!log) return 0;
  return log.count ?? (log.status === "done" ? 1 : 0);
};

const renderJournalIcon = (cx: number, cy: number, entries: JournalEntry[], onClick?: (entries: JournalEntry[]) => void) => (
  <g
    transform={`translate(${cx - 9}, ${cy - 18})`}
    style={{ cursor: "pointer" }}
    onClick={() => entries && onClick?.(entries)}
  >
    <rect x={0} y={0} width={18} height={18} rx={9} fill="hsl(var(--primary))" stroke="hsl(var(--border))" />
    <g transform="translate(3, 3)">
      <NotebookPen size={12} color="hsl(var(--primary-foreground))" />
    </g>
  </g>
);

const ProgressScreen = ({ locale, habits, logs, achievements, journal, isActive = true }: ProgressScreenProps) => {
  const isPageVisible = usePageVisibility();
  const [chartMode, setChartMode] = useState<"week" | "month" | "year">("week");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [showJournalEntries, setShowJournalEntries] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<JournalEntry[] | null>(null);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [metricsCarouselApi, setMetricsCarouselApi] = useState<CarouselApi | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const journalDialogFocusRef = useRef<HTMLDivElement | null>(null);
  const metricsAnimationKeyRef = useRef(0);
  const [metricsAnimationKey, setMetricsAnimationKey] = useState(0);
  const prevActiveRef = useRef(isActive);
  const prevVisibleRef = useRef(isPageVisible);
  const chartDataRef = useRef<ChartPoint[]>([]);

  const journalByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    journal.forEach((entry) => {
      const date = entry.date.slice(0, 10);
      const list = map.get(date) ?? [];
      list.push(entry);
      map.set(date, list);
    });
    return map;
  }, [journal]);

  const availableCategories = useMemo(() => {
    const uncategorized = getCategoryMeta(null);
    const ids = new Set(habits.map((habit) => habit.category).filter(Boolean));
    const list = habitCategories.filter((category) => ids.has(category.id));
    const hasUncategorized = habits.some((habit) => !habit.category);
    return hasUncategorized
      ? [
          ...list,
          {
            id: "uncategorized",
            color: uncategorized.color,
            label: uncategorized.label,
            icon: uncategorized.icon,
          },
        ]
      : list;
  }, [habits]);

  const isAllCategories = categoryFilter.length === 0;
  const activeCategoryIds = useMemo(
    () => (isAllCategories ? availableCategories.map((category) => category.id) : categoryFilter),
    [availableCategories, categoryFilter, isAllCategories]
  );

  const filteredHabits = useMemo(
    () =>
      isAllCategories
        ? habits
        : habits.filter((habit) =>
            habit.category ? categoryFilter.includes(habit.category) : categoryFilter.includes("uncategorized")
          ),
    [categoryFilter, habits, isAllCategories]
  );

  const filteredLogs = useMemo(() => {
    const ids = new Set(filteredHabits.map((habit) => habit.id));
    return logs.filter((log) => ids.has(log.habitId));
  }, [filteredHabits, logs]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, Map<string, HabitLog>>();
    filteredLogs.forEach((log) => {
      if (!map.has(log.date)) map.set(log.date, new Map());
      map.get(log.date)!.set(log.habitId, log);
    });
    return map;
  }, [filteredLogs]);

  const heatmapDays = useMemo(() => {
    if (chartMode === "week") return 7;
    if (chartMode === "month") return 30;
    return 365;
  }, [chartMode]);
  const baseDays = useMemo(() => getPastDays(heatmapDays), [heatmapDays]);

  const pointsByDate = useMemo(() => {
    const map = new Map<string, number>();
    baseDays.forEach((date) => {
      const dayMap = logsByDate.get(date);
      if (!dayMap) {
        map.set(date, 0);
        return;
      }
      let sum = 0;
      dayMap.forEach((log) => {
        sum += getLogPoints(log);
      });
      map.set(date, sum);
    });
    return map;
  }, [baseDays, logsByDate]);

  const totalDone = useMemo(() => {
    let sum = 0;
    baseDays.forEach((date) => {
      sum += pointsByDate.get(date) ?? 0;
    });
    return sum;
  }, [baseDays, pointsByDate]);
  const rhythmRingColor = useMemo(() => {
    const colors = isAllCategories
      ? availableCategories.map((category) => category.color)
      : availableCategories.filter((category) => categoryFilter.includes(category.id)).map((category) => category.color);
    return mixColors(colors) ?? "hsl(var(--chart-1))";
  }, [availableCategories, categoryFilter, isAllCategories]);

  const dailyIntensity = useMemo(() => {
    return baseDays.map((date) => {
      if (!filteredHabits.length) return 0;
      const dayMap = logsByDate.get(date);
      const sum = filteredHabits.reduce((acc, habit) => {
        const log = dayMap?.get(habit.id);
        const count = getLogPoints(log);
        const target = Math.max(1, habit.dailyTarget ?? 1);
        return acc + Math.min(1, count / target);
      }, 0);
      return sum / filteredHabits.length;
    });
  }, [baseDays, filteredHabits, logsByDate]);

  const averageIntensity = useMemo(() => dailyIntensity.length
    ? dailyIntensity.reduce((sum, value) => sum + value, 0) / dailyIntensity.length
    : 0, [dailyIntensity]);
  const completionRateRaw = averageIntensity * 100;
  const completionRate = Math.round(completionRateRaw);

  const bestDayStats = useMemo(() => {
    return baseDays.reduce(
      (best, date) => {
        const points = pointsByDate.get(date) ?? 0;
        return points > best.points ? { date, points } : best;
      },
      { date: baseDays[0] ?? new Date().toISOString().slice(0, 10), points: 0 }
    );
  }, [baseDays, pointsByDate]);

  const averageTouches = Math.round(totalDone / Math.max(1, baseDays.length));
  const journalCount = useMemo(() => {
    let sum = 0;
    baseDays.forEach((date) => {
      sum += journalByDate.get(date)?.length ?? 0;
    });
    return sum;
  }, [baseDays, journalByDate]);
  const bestDayLabel = new Date(bestDayStats.date).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "short",
  });

  const habitPeriodStats = useMemo(() => {
    const sourceHabits = filteredHabits.some((habit) => habit.isPriority)
      ? filteredHabits.filter((habit) => habit.isPriority)
      : filteredHabits;

    return sourceHabits.map((habit) => {
      const target = Math.max(1, habit.dailyTarget ?? 1);
      let totalTouches = 0;
      let completionSum = 0;

      baseDays.forEach((date) => {
        const log = logsByDate.get(date)?.get(habit.id);
        const count = getLogPoints(log);
        totalTouches += count;
        completionSum += Math.min(1, count / target);
      });

      const completionRate = baseDays.length ? completionSum / baseDays.length : 0;

      let streak = 0;
      for (let i = baseDays.length - 1; i >= 0; i -= 1) {
        const date = baseDays[i];
        const log = logsByDate.get(date)?.get(habit.id);
        const count = getLogPoints(log);
        if (count >= target) streak += 1;
        else break;
      }

      return {
        habit,
        totalTouches,
        completionRate,
        streak,
      };
    });
  }, [baseDays, filteredHabits, logsByDate]);

  const habitSpotlights = useMemo(() => {
    if (!habitPeriodStats.length) return [];

    const byTouches = [...habitPeriodStats].sort((a, b) => b.totalTouches - a.totalTouches);
    const byCompletion = [...habitPeriodStats].sort((a, b) => b.completionRate - a.completionRate);
    const byStreak = [...habitPeriodStats].sort((a, b) => b.streak - a.streak);

    const bestTouches = byTouches[0];
    const bestCompletion = byCompletion[0];
    const bestStreak = byStreak[0];

    const seen = new Set<string>();
    const items: Array<{
      id: string;
      title: string;
      value: string | number;
      badge: string;
      badgeDirection: "up" | "down";
      hint: string;
    }> = [];

    if (bestTouches && bestTouches.totalTouches > 0) {
      seen.add(bestTouches.habit.id);
      items.push({
        id: `habit-${bestTouches.habit.id}-touches`,
        title:
          locale === "ru" ? `Топ касаний: ${bestTouches.habit.name}` : `Most touches: ${bestTouches.habit.name}`,
        value: bestTouches.totalTouches,
        badge: `+${bestTouches.totalTouches}`,
        badgeDirection: "up",
        hint: locale === "ru" ? "За выбранный период" : "This period",
      });
    }

    if (bestCompletion && !seen.has(bestCompletion.habit.id) && bestCompletion.completionRate > 0) {
      seen.add(bestCompletion.habit.id);
      const percent = Math.round(bestCompletion.completionRate * 100);
      items.push({
        id: `habit-${bestCompletion.habit.id}-completion`,
        title:
          locale === "ru" ? `Самая стабильная: ${bestCompletion.habit.name}` : `Most consistent: ${bestCompletion.habit.name}`,
        value: `${percent}%`,
        badge: `+${percent}%`,
        badgeDirection: "up",
        hint: locale === "ru" ? "Среднее выполнение" : "Average completion",
      });
    }

    if (bestStreak && !seen.has(bestStreak.habit.id) && bestStreak.streak > 0) {
      const daysLabel = locale === "ru" ? "д" : "d";
      items.push({
        id: `habit-${bestStreak.habit.id}-streak`,
        title: locale === "ru" ? `Стрик: ${bestStreak.habit.name}` : `Streak: ${bestStreak.habit.name}`,
        value: `${bestStreak.streak}${daysLabel}`,
        badge: `+${bestStreak.streak}${daysLabel}`,
        badgeDirection: "up",
        hint: locale === "ru" ? "Подряд в периоде" : "In a row within period",
      });
    }

    return items;
  }, [habitPeriodStats, locale]);

  const insights = useMemo(() => {
    if (!filteredHabits.length) {
      return [
        locale === "ru" ? "Добавь первую привычку — и мы начнём считать прогресс." : "Add your first habit to start tracking progress.",
      ];
    }

    const periodDays = getPastDays(heatmapDays * 2);
    const periodIntensity = periodDays.map((date) => {
      if (!filteredHabits.length) return 0;
      const dayMap = logsByDate.get(date);
      const sum = filteredHabits.reduce((acc, habit) => {
        const log = dayMap?.get(habit.id);
        const count = getLogPoints(log);
        const target = Math.max(1, habit.dailyTarget ?? 1);
        return acc + Math.min(1, count / target);
      }, 0);
      return sum / filteredHabits.length;
    });

    const prevIntensity = periodIntensity.slice(0, heatmapDays);
    const prevAverage = prevIntensity.length ? prevIntensity.reduce((sum, v) => sum + v, 0) / prevIntensity.length : 0;
    const diff = Math.round((averageIntensity - prevAverage) * 100);

    const rhythmInsight =
      diff > 0
        ? locale === "ru"
          ? `Средний ритм +${diff}% к прошлому периоду.`
          : `Average rhythm is +${diff}% vs previous period.`
        : diff < 0
          ? locale === "ru"
            ? `Средний ритм ${diff}% к прошлому периоду.`
            : `Average rhythm is ${diff}% vs previous period.`
          : locale === "ru"
            ? "Средний ритм держится ровно." 
            : "Average rhythm is steady.";

    const bestDay = bestDayStats;
    const bestDayLabel = new Date(bestDay.date).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "short",
    });
    const bestDayInsight =
      bestDay.points > 0
        ? locale === "ru"
          ? `Лучший день: ${bestDayLabel} — ${bestDay.points} касаний.`
          : `Best day: ${bestDayLabel} — ${bestDay.points} touches.`
        : null;

    const habitScores = filteredHabits.map((habit) => {
      const ratioSum = baseDays.reduce((sum, date) => {
        const log = logsByDate.get(date)?.get(habit.id);
        const count = getLogPoints(log);
        const target = Math.max(1, habit.dailyTarget ?? 1);
        return sum + Math.min(1, count / target);
      }, 0);
      return { habit, ratio: ratioSum / Math.max(1, baseDays.length) };
    });
    habitScores.sort((a, b) => b.ratio - a.ratio);
    const topHabit = habitScores[0];
    const topHabitInsight =
      topHabit?.ratio > 0
        ? locale === "ru"
          ? `Самая стабильная: ${topHabit.habit.name}.`
          : `Most consistent: ${topHabit.habit.name}.`
        : null;

    return [rhythmInsight, bestDayInsight, topHabitInsight].filter(Boolean) as string[];
  }, [averageIntensity, baseDays, bestDayStats, filteredHabits, heatmapDays, locale, logsByDate]);

  const insight = useMemo(() => {
    if (!insights.length) return "";
    const index = Math.abs(totalDone + heatmapDays) % insights.length;
    return insights[index];
  }, [heatmapDays, insights, totalDone]);

  const quotes = useMemo(
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
  const [quoteIndex, setQuoteIndex] = useState(0);


  useEffect(() => {
    if (document.querySelector('[data-slot="dialog-overlay"], [data-slot="alert-dialog-overlay"]')) return;
    setQuoteIndex((prev) => (quotes.length ? (prev + 1) % quotes.length : 0));
  }, [quotes.length]);

  useEffect(() => {
    if (!isPageVisible) return undefined;
    const interval = window.setInterval(() => {
      if (document.querySelector('[data-slot="dialog-overlay"], [data-slot="alert-dialog-overlay"]')) return;
      setQuoteIndex((prev) => (quotes.length ? (prev + 1) % quotes.length : 0));
    }, 15000);
    return () => window.clearInterval(interval);
  }, [isPageVisible, quotes.length]);

  const quote = quotes[quoteIndex] ?? quotes[0];

  const metrics = useMemo(
    () => [
      {
        id: "totalDone",
        title: locale === "ru" ? "Сделано всего" : "Total done",
        value: totalDone,
        badge: `+${completionRate}%`,
        badgeDirection: "up" as const,
        hint: locale === "ru" ? "Средний ритм за период" : "Average rhythm this period",
      },
      {
        id: "avgTouches",
        title: locale === "ru" ? "Средние касания" : "Avg touches",
        value: averageTouches,
        badge: `${averageTouches}`,
        badgeDirection: "up" as const,
        hint: locale === "ru" ? "В день по выбранному периоду" : "Per day for selected period",
      },
      {
        id: "bestDay",
        title: locale === "ru" ? "Лучший день" : "Best day",
        value: bestDayLabel,
        badge: `+${bestDayStats.points}`,
        badgeDirection: "up" as const,
        hint: locale === "ru" ? "Максимум касаний" : "Most touches recorded",
      },
      {
        id: "activeHabits",
        title: locale === "ru" ? "Активных привычек" : "Active habits",
        value: filteredHabits.length,
        badge: `${filteredHabits.length}`,
        badgeDirection: "up" as const,
        hint: locale === "ru" ? "Сейчас в работе" : "Currently tracked",
      },
      {
        id: "journalEntries",
        title: locale === "ru" ? "Записей журнала" : "Journal entries",
        value: journalCount,
        badge: `+${journalCount}`,
        badgeDirection: "up" as const,
        hint: locale === "ru" ? "За период" : "Entries this period",
      },
      {
        id: "rhythm",
        title: locale === "ru" ? "Ритм" : "Rhythm",
        value: `${completionRate}%`,
        badge: completionRate >= 50 ? `+${completionRate}%` : `-${Math.abs(50 - completionRate)}%`,
        badgeDirection: completionRate >= 50 ? ("up" as const) : ("down" as const),
        hint: locale === "ru" ? "Стабильность выполнения" : "Consistency score",
      },
      ...habitSpotlights,
    ],
    [averageTouches, bestDayLabel, bestDayStats.points, completionRate, filteredHabits.length, habitSpotlights, journalCount, locale, totalDone]
  );

  const carouselMetrics = useMemo(() => {
    const exclude = new Set(["totalDone", "activeHabits", "rhythm"]);
    const seen = new Set<string>();
    return metrics.filter((metric) => {
      if (exclude.has(metric.id)) return false;
      if (seen.has(metric.id)) return false;
      seen.add(metric.id);
      return true;
    });
  }, [metrics]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 640px)");
    const handleChange = () => setIsCompact(media.matches);
    handleChange();
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    const api = metricsCarouselApi;
    if (!api || !isPageVisible) return;

    const interval = window.setInterval(() => {
      if (document.querySelector('[data-slot="dialog-overlay"], [data-slot="alert-dialog-overlay"]')) return;
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [isPageVisible, metricsCarouselApi]);

  useEffect(() => {
    const becameActive = isActive && !prevActiveRef.current;
    const becameVisible = isPageVisible && !prevVisibleRef.current;
    if (becameActive || becameVisible) {
      metricsAnimationKeyRef.current += 1;
      setMetricsAnimationKey(metricsAnimationKeyRef.current);
    }
    prevActiveRef.current = isActive;
    prevVisibleRef.current = isPageVisible;
  }, [isActive, isPageVisible]);

  const chartSeriesIds = useMemo(() => (isAllCategories ? ["all"] : activeCategoryIds), [activeCategoryIds, isAllCategories]);

  const getDotRenderer = useCallback(
    (seriesId: string) => {
      return (props: unknown): ReactElement<SVGElement> => {
        const dot = props as {
          cx?: number;
          cy?: number;
          payload?: (Record<string, unknown> & {
            date?: string;
            entries?: JournalEntry[];
            onClick?: (entries: JournalEntry[]) => void;
          }) | null;
          active?: boolean;
        };

        if (dot.cx == null || dot.cy == null || !dot.payload) {
          return <circle cx={0} cy={0} r={0} fill="transparent" />;
        }
        const entries = dot.payload.entries ?? [];
        const key = `${dot.payload.date ?? "unknown"}-${seriesId}`;

        const bestSeriesId = (() => {
          let bestId = chartSeriesIds[0] ?? "all";
          let bestValue = Number((dot.payload as Record<string, unknown>)[bestId] ?? 0);
          chartSeriesIds.forEach((id) => {
            const value = Number((dot.payload as Record<string, unknown>)[id] ?? 0);
            if (value > bestValue) {
              bestValue = value;
              bestId = id;
            }
          });
          return bestId;
        })();

        if (showJournalEntries && entries.length) {
          if (seriesId !== bestSeriesId) {
            return <circle key={key} cx={dot.cx} cy={dot.cy} r={0} fill="transparent" />;
          }
          return (
            <g key={key}>
              {renderJournalIcon(dot.cx, dot.cy, entries, dot.payload.onClick)}
            </g>
          );
        }

        return (
          <circle
            key={key}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.active ? 5 : 3.5}
            fill={`var(--color-${seriesId})`}
            stroke="hsl(var(--border))"
            strokeWidth={1}
          />
        );
      };
    },
    [chartSeriesIds, showJournalEntries]
  );

  const habitsByCategory = useMemo(() => {
    const map = new Map<string, Habit[]>();
    filteredHabits.forEach((habit) => {
      const key = habit.category ?? "uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(habit);
    });
    return map;
  }, [filteredHabits]);

  const habitIdsByCategory = useMemo(() => {
    const map = new Map<string, Set<string>>();
    habitsByCategory.forEach((list, categoryId) => {
      map.set(categoryId, new Set(list.map((habit) => habit.id)));
    });
    return map;
  }, [habitsByCategory]);

  const getPointsForDate = useCallback((date: string, habitIds?: Set<string>) => {
    const dayMap = logsByDate.get(date);
    if (!dayMap) return 0;
    if (!habitIds) {
      let sum = 0;
      dayMap.forEach((log) => {
        sum += getLogPoints(log);
      });
      return sum;
    }
    let sum = 0;
    habitIds.forEach((habitId) => {
      sum += getLogPoints(dayMap.get(habitId));
    });
    return sum;
  }, [logsByDate]);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!isActive && chartDataRef.current.length) return chartDataRef.current;
    if (chartMode === "week") {
      const weekDates = getPastDays(7);
      const labels = weekdaysShort(locale);
      return weekDates.map((date) => {
        const weekday = (new Date(date).getDay() + 6) % 7;
        const entries = journalByDate.get(date) ?? [];
        const pointBySeries: Record<string, number> = {};
        chartSeriesIds.forEach((seriesId) => {
          if (seriesId === "all") {
            pointBySeries[seriesId] = getPointsForDate(date);
          } else {
            pointBySeries[seriesId] = getPointsForDate(date, habitIdsByCategory.get(seriesId));
          }
        });
        const marker = entries.length ? Math.max(1, ...Object.values(pointBySeries)) : 0;
        return { label: labels[weekday], entries, date, marker, ...pointBySeries } as ChartPoint;
      });
    }
    if (chartMode === "month") {
      const monthDates = getPastDays(30);
      return monthDates.map((date) => {
        const entries = journalByDate.get(date) ?? [];
        const pointBySeries: Record<string, number> = {};
        chartSeriesIds.forEach((seriesId) => {
          if (seriesId === "all") {
            pointBySeries[seriesId] = getPointsForDate(date);
          } else {
            pointBySeries[seriesId] = getPointsForDate(date, habitIdsByCategory.get(seriesId));
          }
        });
        const marker = entries.length ? Math.max(1, ...Object.values(pointBySeries)) : 0;
        return { label: String(new Date(date).getDate()), entries, date, marker, ...pointBySeries } as ChartPoint;
      });
    }
    const yearDates = getPastDays(365);
    const monthly = new Map<string, { totals: Record<string, number>; count: number; entries: JournalEntry[] }>();
    yearDates.forEach((date) => {
      const dateObj = new Date(date);
      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly.has(key)) {
        monthly.set(key, {
          totals: Object.fromEntries(chartSeriesIds.map((seriesId) => [seriesId, 0])),
          count: 0,
          entries: [],
        });
      }
      const data = monthly.get(key)!;
      chartSeriesIds.forEach((seriesId) => {
        if (seriesId === "all") {
          data.totals[seriesId] += getPointsForDate(date);
        } else {
          data.totals[seriesId] += getPointsForDate(date, habitIdsByCategory.get(seriesId));
        }
      });
      data.count += 1;
      data.entries.push(...(journalByDate.get(date) ?? []));
    });
    const monthNames =
      locale === "ru"
        ? ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
        : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = Array.from(monthly.entries()).map(([key, data]) => {
      const [, month] = key.split("-");
      const pointBySeries = Object.fromEntries(
        chartSeriesIds.map((seriesId) => [
          seriesId,
          Math.round((data.totals[seriesId] ?? 0) / Math.max(1, data.count)),
        ])
      );
      const marker = data.entries.length ? Math.max(1, ...Object.values(pointBySeries)) : 0;
      return {
        label: monthNames[Number(month) - 1],
        entries: data.entries,
        date: `${key}-01`,
        marker,
        ...pointBySeries,
      } as ChartPoint;
    });
    chartDataRef.current = data;
    return data;
  }, [chartMode, chartSeriesIds, getPointsForDate, habitIdsByCategory, isActive, journalByDate, locale]);

  const chartDataWithHandlers = useMemo(() => {
    return chartData.map((point) => ({ ...point, onClick: setSelectedEntries }));
  }, [chartData]);

  const chartConfig = useMemo(() => {
    const baseConfig: Record<string, { label: string; color: string }> = {
      rhythm: {
        label: t("avgRhythm", locale),
        color: rhythmRingColor,
      },
    };
    if (isAllCategories) {
      baseConfig.all = {
        label: t("filterAll", locale),
        color: rhythmRingColor,
      };
    } else {
      activeCategoryIds.forEach((categoryId) => {
        const category = availableCategories.find((item) => item.id === categoryId);
        if (!category) return;
        baseConfig[categoryId] = {
          label: category.label[locale],
          color: category.color,
        };
      });
    }
    return baseConfig;
  }, [activeCategoryIds, availableCategories, isAllCategories, locale, rhythmRingColor]);

  const renderDynamicsTooltip = useCallback(
    (props: TooltipProps<number, string>) => {
      const { active, label, payload } = props;
      if (!active || !payload?.length) return null;

      const entriesCount = (payload?.[0]?.payload as { entries?: JournalEntry[] } | undefined)?.entries?.length ?? 0;
      const labelText = typeof label === "string" ? label : "";

      return (
        <div className="border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
          {labelText ? <div className="font-medium">{labelText}</div> : null}
          <div className="grid gap-1.5">
            {payload
              .filter((item) => item.dataKey && item.value != null)
              .map((item) => {
                const id = String(item.dataKey ?? item.name ?? "value");
                const cfg = (chartConfig as Record<string, { label: string; color: string }>)[id];
                return (
                  <div key={id} className="flex w-full items-center gap-2">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: item.color ?? cfg?.color }} />
                    <div className="flex flex-1 justify-between leading-none">
                      <span className="text-muted-foreground">{cfg?.label ?? id}</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">{Number(item.value).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            {entriesCount > 0 && (
              <div className="flex w-full items-center gap-2">
                <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: "hsl(var(--primary))" }} />
                <div className="flex flex-1 justify-between leading-none">
                  <span className="text-muted-foreground">{locale === "ru" ? "Записей журнала" : "Journal entries"}</span>
                  <span className="text-foreground font-mono font-medium tabular-nums">{entriesCount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    },
    [chartConfig, locale]
  );

  const rhythmChartData = useMemo(
    () => [{ name: "rhythm", value: completionRateRaw, fill: rhythmRingColor }],
    [completionRateRaw, rhythmRingColor]
  );

  const unlockedAchievements = useMemo(() => achievements.filter((achievement) => achievement.unlocked), [achievements]);
  const maxAchievements = 4;

  const achievementGroupOrder = ["priority", "habit", "app", "journal", "discipline"] as const;
  type AchievementGroup = (typeof achievementGroupOrder)[number];

  const habitsById = useMemo(() => new Map(habits.map((habit) => [habit.id, habit])), [habits]);

  const getAchievementGroup = useCallback(
    (achievement: Achievement): AchievementGroup => {
      if (achievement.habitId) {
        const habit = habitsById.get(achievement.habitId);
        return habit?.isPriority ? "priority" : "habit";
      }
    if (
      achievement.id === "achievement-first-habit" ||
      achievement.id === "achievement-five-habits" ||
      achievement.id === "achievement-all-categories" ||
      achievement.id === "achievement-priority-five"
    ) {
      return "app";
    }
    if (
      achievement.id === "achievement-first-entry" ||
      achievement.id === "achievement-week-journal" ||
      achievement.id === "achievement-month-journal" ||
      achievement.id === "achievement-audio-master"
    ) {
      return "journal";
    }
    return "discipline";
    },
    [habitsById]
  );

  const getAchievementTier = useCallback((achievement: Achievement) => {
    if (achievement.id.includes("legendary")) return 3;
    if (achievement.id.includes("rare")) return 2;
    return 1;
  }, []);

  const getAchievementScore = useCallback((achievement: Achievement) => {
    const match = achievement.name.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }, []);

  const groupedAchievements = useMemo(() => {
    const groups: Record<AchievementGroup, Achievement[]> = {
      priority: [],
      habit: [],
      app: [],
      journal: [],
      discipline: [],
    };
    unlockedAchievements.forEach((achievement) => {
      groups[getAchievementGroup(achievement)].push(achievement);
    });
    achievementGroupOrder.forEach((group) => {
      groups[group].sort((a, b) => {
        const tierDiff = getAchievementTier(b) - getAchievementTier(a);
        if (tierDiff !== 0) return tierDiff;
        const scoreDiff = getAchievementScore(b) - getAchievementScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        return a.name.localeCompare(b.name, locale === "ru" ? "ru" : "en");
      });
    });
    return groups;
  }, [achievementGroupOrder, getAchievementGroup, getAchievementScore, getAchievementTier, locale, unlockedAchievements]);

  const flatGroupedAchievements = useMemo(() => {
    return achievementGroupOrder.flatMap((group) => groupedAchievements[group]);
  }, [achievementGroupOrder, groupedAchievements]);

  const visibleGroupedAchievements = showAllAchievements
    ? flatGroupedAchievements
    : flatGroupedAchievements.slice(0, maxAchievements);

  const groupLabels: Record<AchievementGroup, string> = {
    priority: t("achievementsPriorityHabits", locale),
    habit: t("achievementsHabits", locale),
    app: t("achievementsApp", locale),
    journal: t("achievementsJournal", locale),
    discipline: t("achievementsDiscipline", locale),
  };

  const visibleGroupedBuckets = useMemo<Record<AchievementGroup, Achievement[]>>(() => {
    if (showAllAchievements) return groupedAchievements;
    const remaining = new Map<AchievementGroup, number>();
    achievementGroupOrder.forEach((group) => remaining.set(group, groupedAchievements[group].length));
    const bucket: Record<AchievementGroup, Achievement[]> = {
      priority: [],
      habit: [],
      app: [],
      journal: [],
      discipline: [],
    };
    visibleGroupedAchievements.forEach((achievement) => {
      const group = getAchievementGroup(achievement);
      if ((remaining.get(group) ?? 0) <= 0) return;
      bucket[group].push(achievement);
      remaining.set(group, (remaining.get(group) ?? 0) - 1);
    });
    return bucket;
  }, [achievementGroupOrder, getAchievementGroup, groupedAchievements, showAllAchievements, visibleGroupedAchievements]);

  const showMetricSkeleton = habits.length === 0 && logs.length === 0;
  const metricAnimationEnabled = isPageVisible && isActive;

  return (
    <div className="grid gap-6 max-w-full" style={{ maxWidth: '100vw', width: '100%', minWidth: '0', flexShrink: '1', flexBasis: '0', boxSizing: 'border-box', touchAction: 'pan-y' }}>
      <Card className="w-full max-w-full overflow-hidden">
        <CardContent className="space-y-6">
          {isCompact ? (
            <Carousel
              opts={{ align: "start", loop: true, watchDrag: false, watchSlides: false }}
              setApi={setMetricsCarouselApi}
              className="relative max-w-full overflow-hidden"
              style={{ touchAction: 'pan-y', contain: 'layout paint' }}
            >
              <CarouselContent className="max-w-full">
                {carouselMetrics.map((metric, index) => (
                  <CarouselItem key={`${metric.title}-${index}`} className="basis-full">
                    <div className="h-full p-1">
                      <motion.div custom={index} variants={metricCardVariants} initial="hidden" animate="show" className="h-full">
                        <div className="h-full">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.title}</p>
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                {metric.badgeDirection === "down" ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                                {metric.badge}
                              </Badge>
                            </div>
                            <div className="text-2xl font-semibold tabular-nums sm:text-3xl">
                              {showMetricSkeleton ? (
                                <Skeleton className="h-7 w-20" />
                              ) : typeof metric.value === "number" ? (
                                <CountUpValue key={`metric-${metric.id}-${metricsAnimationKey}`} value={metric.value} enabled={metricAnimationEnabled} />
                              ) : (
                                metric.value
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-1 text-xs">
                            <div className="line-clamp-1 flex items-center gap-1.5 font-semibold">
                              {metric.badgeDirection === "down"
                                ? locale === "ru"
                                  ? "Нужно внимание"
                                  : "Needs attention"
                                : locale === "ru"
                                  ? "Хороший темп"
                                  : "On a good pace"}
                              {metric.badgeDirection === "down" ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                            </div>
                            {showMetricSkeleton ? (
                              <Skeleton className="h-3 w-28" />
                            ) : (
                              <div className="line-clamp-1 text-muted-foreground">{metric.hint}</div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : (
            <Carousel
              opts={{ align: "start", loop: true, watchDrag: false, watchSlides: false }}
              setApi={setMetricsCarouselApi}
              className="relative max-w-full overflow-hidden"
              style={{ touchAction: 'pan-y', contain: 'layout paint' }}
            >
              <CarouselContent className="max-w-full">
                {carouselMetrics.map((metric, index) => (
                  <CarouselItem key={`${metric.title}-${index}`} className="basis-full sm:basis-1/2 lg:basis-1/3">
                    <div className="h-full p-1">
                      <motion.div custom={index} variants={metricCardVariants} initial="hidden" animate="show" className="h-full">
                        <div className="h-full rounded-xl bg-card text-card-foreground">
                          <div className="space-y-2 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.title}</p>
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                {metric.badgeDirection === "down" ? (
                                  <TrendingDown className="size-3.5" />
                                ) : (
                                  <TrendingUp className="size-3.5" />
                                )}
                                {metric.badge}
                              </Badge>
                            </div>
                            <div className="text-2xl font-semibold tabular-nums sm:text-3xl">
                              {showMetricSkeleton ? (
                                <Skeleton className="h-7 w-20" />
                              ) : typeof metric.value === "number" ? (
                                <CountUpValue key={`metric-${metric.id}-${metricsAnimationKey}`} value={metric.value} enabled={metricAnimationEnabled} />
                              ) : (
                                metric.value
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-1 px-4 pb-4 text-xs">
                            <div className="line-clamp-1 flex items-center gap-1.5 font-semibold">
                              {metric.badgeDirection === "down"
                                ? locale === "ru"
                                  ? "Нужно внимание"
                                  : "Needs attention"
                                : locale === "ru"
                                  ? "Хороший темп"
                                  : "On a good pace"}
                              {metric.badgeDirection === "down" ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                            </div>
                            {showMetricSkeleton ? <Skeleton className="h-3 w-28" /> : <div className="line-clamp-1 text-muted-foreground">{metric.hint}</div>}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}

          <Separator className="my-3" />

          <div className="space-y-4 pt-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{t("dynamics", locale)}</p>
                <p className="text-xs text-muted-foreground">
                {chartMode === "week"
                  ? t("periodWeek", locale)
                  : chartMode === "month"
                    ? t("period30Days", locale)
                    : t("periodYear", locale)}
                </p>
              </div>
              <ToggleGroup
                type="single"
                value={chartMode}
                onValueChange={(value) => value && setChartMode(value as "week" | "month" | "year")}
                variant="outline"
                size="sm"
                spacing={0}
                className="flex w-full max-w-full flex-wrap overflow-hidden"
              >
                <ToggleGroupItem value="week" size="sm">
                  {t("periodWeek", locale)}
                </ToggleGroupItem>
                <ToggleGroupItem value="month" size="sm">
                  {t("periodMonth", locale)}
                </ToggleGroupItem>
                <ToggleGroupItem value="year" size="sm">
                  {t("periodYear", locale)}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex w-full max-w-full flex-wrap gap-2 overflow-hidden">
              <Button type="button" size="xs" variant={isAllCategories ? "default" : "outline"} onClick={() => setCategoryFilter([])}>
                {t("filterAll", locale)}
              </Button>
              {availableCategories.map((category) => {
                const isActive = categoryFilter.includes(category.id);
                return (
                  <Button
                    key={category.id}
                    type="button"
                    size="xs"
                    variant={isActive ? "default" : "outline"}
                    className={isActive ? "text-white" : undefined}
                    style={isActive ? { backgroundColor: category.color, borderColor: category.color } : undefined}
                    onClick={() => {
                      setCategoryFilter((prev) => {
                        if (prev.includes(category.id)) {
                          const next = prev.filter((id) => id !== category.id);
                          return next.length ? next : [];
                        }
                        return [...prev, category.id];
                      });
                    }}
                  >
                    {category.label[locale]}
                  </Button>
                );
              })}
              <Button
                type="button"
                size="xs"
                variant={showJournalEntries ? "default" : "outline"}
                onClick={() => setShowJournalEntries(!showJournalEntries)}
              >
                {t("journal", locale)}
              </Button>
            </div>
            <div className="overflow-hidden" style={{ touchAction: 'pan-y', contain: 'layout paint' }}>
              <ChartContainer config={chartConfig} className="h-[200px] w-full" style={{ touchAction: 'pan-y' }}>
                  <ComposedChart data={chartDataWithHandlers} margin={{ top: 28, left: 12, right: 12, bottom: 6 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis hide domain={[0, (dataMax: number) => Math.max(1, dataMax + 3)]} />
                    <ChartTooltip cursor={false} content={renderDynamicsTooltip} />
                    {chartSeriesIds.map((seriesId) => (
                      <Area
                        key={seriesId}
                        dataKey={seriesId}
                        type="monotone"
                        fill={`var(--color-${seriesId})`}
                        fillOpacity={chartSeriesIds.length > 1 ? 0.08 : 0.25}
                        stroke={`var(--color-${seriesId})`}
                        strokeWidth={2}
                        dot={getDotRenderer(seriesId)}
                        activeDot={getDotRenderer(seriesId)}
                        isAnimationActive
                        animationBegin={0}
                        animationDuration={650}
                      />
                    ))}
                  </ComposedChart>
                </ChartContainer>
            </div>
          </div>

          <Separator className="my-3" />

          <div style={{ maxWidth: "100vw", overflowX: "hidden" }}>
            <table className="w-full table-fixed text-sm">
              <tbody>
                <tr>
                  <td className="w-1/3 align-top px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("totalDoneAll", locale)}</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums">
                      <CountUpValue key={`total-${metricsAnimationKey}`} value={totalDone} enabled={metricAnimationEnabled} />
                    </p>
                  </td>
                  <td className="w-1/3 align-top px-3 py-2" style={{ maxWidth: "100%", overflowX: "hidden", minWidth: "0" }}>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("avgRhythm", locale)}</p>
                    <div
                      className="mt-2 flex items-center justify-start overflow-hidden"
                      style={{ maxWidth: "96px", overflowX: "hidden", minWidth: "96px", width: "96px" }}
                    >
                      <div
                        className="relative overflow-hidden"
                        style={{ maxWidth: "96px", overflowX: "hidden", minWidth: "96px", width: "96px" }}
                      >
                          <ChartContainer
                            config={chartConfig}
                            className="aspect-square w-[96px]"
                            style={{ maxWidth: "96px", overflowX: "hidden", minWidth: "96px", width: "96px", touchAction: 'pan-y' }}
                          >
                            <RadialBarChart data={rhythmChartData} innerRadius={34} outerRadius={44} startAngle={90} endAngle={-270}>
                              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="rhythm" />} />
                              <RadialBar dataKey="value" background cornerRadius={8} />
                            </RadialBarChart>
                          </ChartContainer>
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                          <CountUpValue key={`rhythm-${metricsAnimationKey}`} value={completionRate} suffix="%" enabled={metricAnimationEnabled} />
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="w-1/3 align-top px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("activeHabits", locale)}</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums">
                      <CountUpValue key={`active-${metricsAnimationKey}`} value={filteredHabits.length} enabled={metricAnimationEnabled} />
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-full">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{t("progressQuote", locale)}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm italic text-muted-foreground">“{locale === "ru" ? quote.ru : quote.en}”</p>
          <p className="text-xs text-muted-foreground">— {quote.author}</p>
        </CardContent>
      </Card>

      <Card className="w-full overflow-visible">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("achievements", locale)}</CardTitle>
            <span className="text-xs text-muted-foreground">{unlockedAchievements.length}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {unlockedAchievements.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noUnlockedAchievements", locale)}</p>
          ) : (
            <Collapsible open={showAllAchievements} onOpenChange={setShowAllAchievements}>
              <div className="grid gap-4" style={{ contain: 'layout' }}>
                {achievementGroupOrder.map((group) => {
                  const items = visibleGroupedBuckets[group];
                  if (!items?.length) return null;

                  return (
                    <AchievementGroup key={group} title={groupLabels[group]} achievements={items} locale={locale} />
                  );
                })}
              </div>
              {unlockedAchievements.length > maxAchievements && (
                <div className="mt-3 flex justify-center overflow-hidden" style={{ width: '100%', maxWidth: '100vw', overflow: 'hidden', boxSizing: 'border-box', minWidth: '0', flexShrink: '1', flexBasis: '0' }}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline">
                      {showAllAchievements ? t("collapseAll", locale) : t("showMore", locale)}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              )}
            </Collapsible>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedEntries)} onOpenChange={(value) => (!value ? setSelectedEntries(null) : null)}>
        <DialogContent
          className="max-w-[560px] max-h-[70svh] overflow-hidden"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            journalDialogFocusRef.current?.focus();
          }}
        >
          <div ref={journalDialogFocusRef} tabIndex={-1} />
          <DialogHeader>
            <DialogTitle>{t("journal", locale)}</DialogTitle>
            <DialogDescription className="sr-only">{t("dialogDetails", locale)}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid gap-3 overflow-y-auto pr-1" style={{ maxHeight: "calc(70svh - 140px)" }}>
            {selectedEntries?.map((entry) => (
              <Card
                key={entry.id}
                className="p-4 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString()}
                </p>
                {entry.type === "audio" ? (
                  <div className="mt-3">
                    <AudioAnchor src={entry.content} locale={locale} />
                    {entry.textContent && (
                      <p className="mt-3 text-sm leading-snug break-words">{entry.textContent}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-snug break-words">{entry.content}</p>
                )}
                {entry.emotions?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {entry.emotions.map((emotion) => {
                      const label = emotionLabels[emotion] ?? { ru: emotion, en: emotion };
                      return (
                        <Badge key={`${entry.id}-${emotion}`} variant="secondary" className="text-[11px] font-semibold">
                          {locale === "ru" ? label.ru : label.en}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgressScreen;
