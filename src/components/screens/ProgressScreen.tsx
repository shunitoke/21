"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Achievement, Habit, HabitLog, JournalEntry, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { getPastDays } from "@/lib/date";
import { getCategoryMeta, habitCategories } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AudioAnchor from "@/components/AudioAnchor";
import { Badge } from "@/components/ui/badge";
import { useProgressMetrics } from "@/hooks/useProgressMetrics";
import { MetricsCarousel, type Metric } from "@/components/progress/MetricsCarousel";
import { ProgressChart, type ChartPoint } from "@/components/progress/ProgressChart";
import { QuoteRotator } from "@/components/progress/QuoteRotator";
import { AchievementsSection } from "@/components/progress/AchievementsSection";
import { CountUpValue } from "@/components/progress/CountUpValue";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

interface ProgressScreenProps {
  locale: Locale;
  habits: Habit[];
  logs: HabitLog[];
  achievements: Achievement[];
  journal: JournalEntry[];
  isActive?: boolean;
}

const getLogPoints = (log?: HabitLog) => {
  if (!log) return 0;
  return log.count ?? (log.status === "done" ? 1 : 0);
};

const mixColors = (colors: string[]) => {
  const validColors = colors.filter(Boolean);
  if (!validColors.length) return null;
  if (validColors.length === 1) return validColors[0];
  return validColors.reduce((mixed, color) => `color-mix(in hsl, ${mixed} 50%, ${color} 50%)`);
};

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

export default function ProgressScreen({
  locale,
  habits,
  logs,
  achievements,
  journal,
  isActive = true,
}: ProgressScreenProps) {
  const [chartMode, setChartMode] = useState<"week" | "month" | "year">("week");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [showJournalEntries, setShowJournalEntries] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<JournalEntry[] | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const journalDialogFocusRef = useRef<HTMLDivElement | null>(null);
  const metricsAnimationKeyRef = useRef(0);
  const [metricsAnimationKey, setMetricsAnimationKey] = useState(0);

  const {
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
  } = useProgressMetrics({
    locale,
    habits,
    logs,
    journal,
    chartMode,
    categoryFilter,
    isActive,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 640px)");
    const handleChange = () => setIsCompact(media.matches);
    handleChange();
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    if (isActive && isPageVisible) {
      metricsAnimationKeyRef.current += 1;
      setMetricsAnimationKey(metricsAnimationKeyRef.current);
    }
  }, [isActive, isPageVisible]);

  const availableCategories = useMemo(() => {
    const uncategorized = getCategoryMeta(null);
    const ids = new Set(habits.map((habit) => habit.category).filter(Boolean));
    const list = habitCategories.filter((category) => ids.has(category.id));
    const hasUncategorized = habits.some((habit) => !habit.category);
    return hasUncategorized
      ? [...list, { id: "uncategorized", color: uncategorized.color, label: uncategorized.label, icon: uncategorized.icon }]
      : list;
  }, [habits]);

  const activeCategoryIds = useMemo(
    () => (isAllCategories ? availableCategories.map((c) => c.id) : categoryFilter),
    [availableCategories, categoryFilter, isAllCategories]
  );

  const chartSeriesIds = useMemo(() => (isAllCategories ? ["all"] : activeCategoryIds), [activeCategoryIds, isAllCategories]);

  const rhythmRingColor = useMemo(() => {
    const colors = isAllCategories
      ? availableCategories.map((c) => c.color)
      : availableCategories.filter((c) => categoryFilter.includes(c.id)).map((c) => c.color);
    return mixColors(colors) ?? "hsl(var(--chart-1))";
  }, [availableCategories, categoryFilter, isAllCategories]);

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
      map.set(categoryId, new Set(list.map((h) => h.id)));
    });
    return map;
  }, [habitsByCategory]);

  const getPointsForDate = useCallback(
    (date: string, habitIds?: Set<string>) => {
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
    },
    [logsByDate]
  );

  const chartData = useMemo<ChartPoint[]>(() => {
    if (chartMode === "week") {
      const weekDates = getPastDays(7);
      const labels = locale === "ru" ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return weekDates.map((date) => {
        const weekday = (new Date(date).getDay() + 6) % 7;
        const entries = journalByDate.get(date) ?? [];
        const pointBySeries: Record<string, number> = {};
        chartSeriesIds.forEach((seriesId) => {
          pointBySeries[seriesId] = seriesId === "all" 
            ? getPointsForDate(date) 
            : getPointsForDate(date, habitIdsByCategory.get(seriesId));
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
          pointBySeries[seriesId] = seriesId === "all"
            ? getPointsForDate(date)
            : getPointsForDate(date, habitIdsByCategory.get(seriesId));
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
          totals: Object.fromEntries(chartSeriesIds.map((id) => [id, 0])),
          count: 0,
          entries: [],
        });
      }
      const data = monthly.get(key)!;
      chartSeriesIds.forEach((seriesId) => {
        data.totals[seriesId] += seriesId === "all"
          ? getPointsForDate(date)
          : getPointsForDate(date, habitIdsByCategory.get(seriesId));
      });
      data.count += 1;
      data.entries.push(...(journalByDate.get(date) ?? []));
    });
    const monthNames = locale === "ru"
      ? ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Array.from(monthly.entries()).map(([key, data]) => {
      const [, month] = key.split("-");
      const pointBySeries = Object.fromEntries(
        chartSeriesIds.map((id) => [id, Math.round((data.totals[id] ?? 0) / Math.max(1, data.count))])
      );
      const marker = data.entries.length ? Math.max(1, ...Object.values(pointBySeries)) : 0;
      return { label: monthNames[Number(month) - 1], entries: data.entries, date: `${key}-01`, marker, ...pointBySeries } as ChartPoint;
    });
  }, [chartMode, chartSeriesIds, getPointsForDate, habitIdsByCategory, journalByDate, locale]);

  const chartConfig = useMemo(() => {
    const baseConfig: Record<string, { label: string; color: string }> = { rhythm: { label: t("avgRhythm", locale), color: rhythmRingColor } };
    if (isAllCategories) {
      baseConfig.all = { label: t("filterAll", locale), color: rhythmRingColor };
    } else {
      activeCategoryIds.forEach((categoryId) => {
        const category = availableCategories.find((item) => item.id === categoryId);
        if (category) {
          baseConfig[categoryId] = { label: category.label[locale], color: category.color };
        }
      });
    }
    return baseConfig;
  }, [activeCategoryIds, availableCategories, isAllCategories, locale, rhythmRingColor]);

  const rhythmChartData = useMemo(() => [{ name: "rhythm", value: completionRateRaw, fill: rhythmRingColor }], [completionRateRaw, rhythmRingColor]);

  const metrics: Metric[] = useMemo(
    () => [
      { id: "totalDone", title: locale === "ru" ? "Сделано всего" : "Total done", value: totalDone, badge: `+${completionRate}%`, badgeDirection: "up", hint: locale === "ru" ? "Средний ритм за период" : "Average rhythm this period" },
      { id: "avgTouches", title: locale === "ru" ? "Средние касания" : "Avg touches", value: averageTouches, badge: `${averageTouches}`, badgeDirection: "up", hint: locale === "ru" ? "В день по выбранному периоду" : "Per day for selected period" },
      { id: "bestDay", title: locale === "ru" ? "Лучший день" : "Best day", value: bestDayLabel, badge: `+${bestDayStats.points}`, badgeDirection: "up", hint: locale === "ru" ? "Максимум касаний" : "Most touches recorded" },
      { id: "activeHabits", title: locale === "ru" ? "Активных привычек" : "Active habits", value: filteredHabits.length, badge: `${filteredHabits.length}`, badgeDirection: "up", hint: locale === "ru" ? "Сейчас в работе" : "Currently tracked" },
      { id: "journalEntries", title: locale === "ru" ? "Записей журнала" : "Journal entries", value: journalCount, badge: `+${journalCount}`, badgeDirection: "up", hint: locale === "ru" ? "За период" : "Entries this period" },
      { id: "rhythm", title: locale === "ru" ? "Ритм" : "Rhythm", value: `${completionRate}%`, badge: completionRate >= 50 ? `+${completionRate}%` : `-${Math.abs(50 - completionRate)}%`, badgeDirection: completionRate >= 50 ? "up" : "down", hint: locale === "ru" ? "Стабильность выполнения" : "Consistency score" },
    ],
    [averageTouches, bestDayLabel, bestDayStats.points, completionRate, filteredHabits.length, journalCount, locale, totalDone]
  );

  const carouselMetrics = useMemo(() => {
    const exclude = new Set(["totalDone", "activeHabits", "rhythm"]);
    return metrics.filter((m) => !exclude.has(m.id));
  }, [metrics]);

  const showMetricSkeleton = habits.length === 0 && logs.length === 0;

  return (
    <div className="grid gap-6 max-w-full" style={{ maxWidth: '100vw', width: '100%', minWidth: '0', flexShrink: '1', flexBasis: '0', boxSizing: 'border-box', touchAction: 'pan-y' }}>
      <Card className="w-full max-w-full overflow-hidden">
        <CardContent className="space-y-6">
          <MetricsCarousel
            metrics={carouselMetrics}
            locale={locale}
            isCompact={isCompact}
            showSkeleton={showMetricSkeleton}
            animationKey={metricsAnimationKey}
            animationEnabled={metricAnimationEnabled}
          />

          <Separator className="my-3" />

          <div className="space-y-4 pt-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{t("dynamics", locale)}</p>
                <p className="text-xs text-muted-foreground">
                  {chartMode === "week" ? t("periodWeek", locale) : chartMode === "month" ? t("period30Days", locale) : t("periodYear", locale)}
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
                <ToggleGroupItem value="week" size="sm">{t("periodWeek", locale)}</ToggleGroupItem>
                <ToggleGroupItem value="month" size="sm">{t("periodMonth", locale)}</ToggleGroupItem>
                <ToggleGroupItem value="year" size="sm">{t("periodYear", locale)}</ToggleGroupItem>
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
              <Button type="button" size="xs" variant={showJournalEntries ? "default" : "outline"} onClick={() => setShowJournalEntries(!showJournalEntries)}>
                {t("journal", locale)}
              </Button>
            </div>
            <ProgressChart
              data={chartData}
              locale={locale}
              chartMode={chartMode}
              seriesIds={chartSeriesIds}
              chartConfig={chartConfig}
              showJournalEntries={showJournalEntries}
              onSelectEntries={setSelectedEntries}
            />
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
                    <div className="mt-2 flex items-center justify-start overflow-hidden" style={{ maxWidth: "96px", overflowX: "hidden", minWidth: "96px", width: "96px" }}>
                      <div className="relative overflow-hidden" style={{ maxWidth: "96px", overflowX: "hidden", minWidth: "96px", width: "96px" }}>
                        <ChartContainer config={chartConfig} className="aspect-square w-[96px]" style={{ maxWidth: "96px", overflowX: "hidden", minWidth: "96px", width: "96px", touchAction: "pan-y" }}>
                          <RadialBarChart data={rhythmChartData} innerRadius={34} outerRadius={44} startAngle={90} endAngle={-270}>
                            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                            <ChartTooltipContent hideLabel nameKey="rhythm" />
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
          <QuoteRotator locale={locale} />
        </CardContent>
      </Card>

      <Card className="w-full overflow-visible">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("achievements", locale)}</CardTitle>
            <span className="text-xs text-muted-foreground">{achievements.filter((a) => a.unlocked).length}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AchievementsSection achievements={achievements} habits={habits} locale={locale} />
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedEntries)} onOpenChange={(value) => (!value ? setSelectedEntries(null) : null)}>
        <DialogContent className="max-w-[560px] max-h-[70svh] overflow-hidden" onOpenAutoFocus={(event) => { event.preventDefault(); journalDialogFocusRef.current?.focus(); }}>
          <div ref={journalDialogFocusRef} tabIndex={-1} />
          <DialogHeader>
            <DialogTitle>{t("journal", locale)}</DialogTitle>
            <DialogDescription className="sr-only">{t("dialogDetails", locale)}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid gap-3 overflow-y-auto pr-1" style={{ maxHeight: "calc(70svh - 140px)" }}>
            {selectedEntries?.map((entry) => (
              <Card key={entry.id} className="p-4 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</p>
                {entry.type === "audio" ? (
                  <div className="mt-3">
                    <AudioAnchor src={entry.content} locale={locale} />
                    {entry.textContent && <p className="mt-3 text-sm leading-snug break-words">{entry.textContent}</p>}
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
}
