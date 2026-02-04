"use client";

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toISODate } from "@/lib/date";
import { vibrationFeedback } from "@/utils/vibrationUtils";
import type { Habit, HabitLog, Locale } from "@/lib/types";
import { ru } from "date-fns/locale";
import type { DayButton } from "react-day-picker";

interface HabitCalendarProps {
  habit: Habit;
  logs: HabitLog[];
  locale: Locale;
  month: Date;
  selectedDate: string | null;
  targetValue: number;
  onMonthChange: (date: Date) => void;
  onSelectDate: (date: string) => void;
  onToggleDate: (habitId: string, date: string, target: number) => void;
}

export function HabitCalendar({
  habit,
  logs,
  locale,
  month,
  selectedDate,
  targetValue,
  onMonthChange,
  onSelectDate,
  onToggleDate,
}: HabitCalendarProps) {
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const selectedDay = useMemo(() => {
    if (!selectedDate) return undefined;
    return new Date(`${selectedDate}T00:00:00`);
  }, [selectedDate]);

  const HabitCalendarDayButton = useMemo(() => {
    const colorToken = habit.colorToken;

    return function HabitCalendarDayButtonImpl({
      className,
      day,
      modifiers,
      children,
      ...props
    }: React.ComponentProps<typeof DayButton>) {
      const iso = toISODate(day.date);
      const entry = logs.find((log) => log.habitId === habit.id && log.date === iso);
      const count = entry ? Number(entry.count ?? 1) : 0;
      
      const dots = (() => {
        const maxDots = Math.min(5, Math.max(1, targetValue));
        if (count <= 0) return 0;
        if (targetValue <= 1) return maxDots;
        if (count >= targetValue) return maxDots;
        if (maxDots <= 1) return 1;
        const progress = (count - 1) / (targetValue - 1);
        const scaled = Math.floor(progress * (maxDots - 1));
        return 1 + Math.min(maxDots - 2, scaled);
      })();
      
      const isSelected = Boolean(modifiers?.selected);
      const isTouched = count > 0;

      const computedStyle: React.CSSProperties | undefined = (() => {
        const base: React.CSSProperties = {};
        if (isTouched) {
          base.backgroundColor = `color-mix(in hsl, ${colorToken} 12%, transparent)`;
        }
        if (isSelected) {
          base.boxShadow = `inset 0 0 0 1px color-mix(in hsl, ${colorToken} 45%, transparent)`;
          base.transform = "scale(1.03)";
        }
        return Object.keys(base).length > 0 ? base : undefined;
      })();

      const { style: propStyle, ...buttonProps } = props;
      const mergedStyle: React.CSSProperties = {
        ...(propStyle ?? {}),
        ...(computedStyle ?? {}),
        ["--day-accent" as unknown as string]: colorToken,
      };

      return (
        <Button
          {...buttonProps}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative flex aspect-square size-auto w-full min-w-0 flex-col items-center justify-center gap-1 rounded-md p-0 text-sm leading-none overflow-hidden",
            "transition-[background-color,box-shadow,transform] duration-200 ease-out will-change-transform",
            "hover:bg-accent/35 hover:ring-2 hover:ring-[var(--day-accent)]",
            "active:scale-[0.98]",
            "after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:bg-[var(--day-accent)] after:opacity-0 after:scale-75 after:transition-[opacity,transform] after:duration-200",
            "active:after:opacity-20 active:after:scale-100",
            "disabled:pointer-events-none disabled:opacity-50",
            className
          )}
          style={mergedStyle}
          onPointerDown={() => vibrationFeedback.priorityButtonPress()}
        >
          <span>{children}</span>
          {dots > 0 && (
            <span
              className="flex h-1.5 items-center justify-center gap-1 transition-all duration-200 ease-out"
              style={{ color: colorToken, opacity: isSelected ? 1 : 0.9, transform: isSelected ? "scale(1.05)" : "scale(1)" }}
            >
              {Array.from({ length: dots }).map((_, i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-current opacity-80" />
              ))}
            </span>
          )}
        </Button>
      );
    };
  }, [habit, logs, targetValue]);

  const handleDayClick = useCallback((day: Date) => {
    const iso = toISODate(day);
    onSelectDate(iso);
    onToggleDate(habit.id, iso, targetValue);
  }, [habit.id, targetValue, onSelectDate, onToggleDate]);

  const handleSelect = useCallback((value: Date | undefined) => {
    if (!value) return;
    onSelectDate(toISODate(value));
  }, [onSelectDate]);

  const Nav = useCallback(({ onPreviousClick, onNextClick }: { onPreviousClick?: React.MouseEventHandler<HTMLButtonElement>; onNextClick?: React.MouseEventHandler<HTMLButtonElement> }) => (
    <div className="flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 p-0"
        onClick={onPreviousClick}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 p-0"
        onClick={onNextClick}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  ), []);

  const calendarComponents = useMemo(() => ({
    DayButton: HabitCalendarDayButton,
    Nav,
  }), [HabitCalendarDayButton, Nav]);

  return (
    <Calendar
      mode="single"
      month={month}
      selected={selectedDay}
      locale={locale === "ru" ? ru : undefined}
      formatters={{
        formatCaption: (date) =>
          date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
            month: "long",
            year: "numeric",
          }),
      }}
      components={calendarComponents}
      onSelect={handleSelect}
      onDayClick={handleDayClick}
      onMonthChange={onMonthChange}
      disabled={{ after: today }}
      weekStartsOn={1}
      className="w-full max-w-full"
    />
  );
}
