"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HabitLog, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";

interface QuickEntryProps {
  habitId: string;
  selectedDate: string | null;
  logs: HabitLog[];
  targetValue: number;
  locale: Locale;
  colorToken?: string;
  onSetDate: (habitId: string, date: string, count: number) => void;
}

export function QuickEntry({
  habitId,
  selectedDate,
  logs,
  targetValue,
  locale,
  colorToken,
  onSetDate,
}: QuickEntryProps) {
  const [inputValue, setInputValue] = useState("0");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;
    const activeLog = logs.find((log) => log.date === selectedDate);
    setInputValue(String(activeLog?.count ?? 0));
    setIsDirty(false);
  }, [selectedDate, logs]);

  const handleDecrease = () => {
    if (!selectedDate) return;
    const nextValue = Math.max(0, Number(inputValue) - 1);
    setInputValue(String(nextValue));
    setIsDirty(false);
    onSetDate(habitId, selectedDate, nextValue);
  };

  const handleIncrease = () => {
    if (!selectedDate) return;
    const nextValue = Math.min(targetValue, Number(inputValue) + 1);
    setInputValue(String(nextValue));
    setIsDirty(false);
    onSetDate(habitId, selectedDate, nextValue);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    setIsDirty(true);
  };

  const handleBlur = () => {
    if (!selectedDate) return;
    const nextValue = Math.max(0, Math.min(targetValue, Number(inputValue) || 0));
    setInputValue(String(nextValue));
    onSetDate(habitId, selectedDate, nextValue);
    setIsDirty(false);
  };

  const handleSave = () => {
    if (!selectedDate) return;
    const nextValue = Math.max(0, Math.min(targetValue, Number(inputValue) || 0));
    setInputValue(String(nextValue));
    onSetDate(habitId, selectedDate, nextValue);
    setIsDirty(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{t("quickEntry", locale)}</span>
        {selectedDate && <span style={{ color: colorToken }}>{selectedDate}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!selectedDate}
          aria-label={locale === "ru" ? "Уменьшить" : "Decrease"}
          onClick={handleDecrease}
        >
          −
        </Button>
        <Input
          value={inputValue}
          type="number"
          min={0}
          max={targetValue}
          disabled={!selectedDate}
          onChange={handleChange}
          onBlur={handleBlur}
          className="h-9 w-[84px] text-center"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!selectedDate}
          aria-label={locale === "ru" ? "Увеличить" : "Increase"}
          onClick={handleIncrease}
        >
          +
        </Button>
        <Button
          type="button"
          size="icon"
          disabled={!selectedDate || !isDirty}
          aria-label={t("save", locale)}
          onClick={handleSave}
        >
          ✓
        </Button>
      </div>
    </div>
  );
}
