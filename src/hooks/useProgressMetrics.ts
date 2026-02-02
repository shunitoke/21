"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import type { Achievement, Habit, HabitLog, JournalEntry, Locale } from "@/lib/types";
import { getPastDays } from "@/lib/date";
import { t } from "@/lib/i18n";

const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));

  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return isVisible;
};

export const useCountUp = (value: number, duration = 900, enabled = true) => {
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

const getLogPoints = (log?: HabitLog) => {
  if (!log) return 0;
  return log.count ?? (log.status === "done" ? 1 : 0);
};

interface UseProgressMetricsProps {
  locale: Locale;
  habits: Habit[];
  logs: HabitLog[];
  journal: JournalEntry[];
  chartMode: "week" | "month" | "year";
  categoryFilter: string[];
  isActive: boolean;
}

export function useProgressMetrics({
  locale,
  habits,
  logs,
  journal,
  chartMode,
  categoryFilter,
  isActive,
}: UseProgressMetricsProps) {
  const isPageVisible = usePageVisibility();
  const metricAnimationEnabled = isPageVisible && isActive;

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

  const isAllCategories = categoryFilter.length === 0;

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

  const averageIntensity = useMemo(
    () => (dailyIntensity.length ? dailyIntensity.reduce((sum, value) => sum + value, 0) / dailyIntensity.length : 0),
    [dailyIntensity]
  );
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

  return {
    isPageVisible,
    metricAnimationEnabled,
    totalDone,
    completionRate,
    completionRateRaw,
    averageTouches,
    bestDayStats,
    bestDayLabel,
    journalCount,
    filteredHabits,
    isAllCategories,
    baseDays,
    logsByDate,
    journalByDate,
    heatmapDays,
    useCountUp,
  };
}

export type { UseProgressMetricsProps };
