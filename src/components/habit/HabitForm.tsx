"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { habitCategories } from "@/lib/categories";
import { t } from "@/lib/i18n";
import type { HabitCategoryId, Locale } from "@/lib/types";

interface HabitFormProps {
  locale: Locale;
  name: string;
  description: string;
  dailyTarget: string;
  category: HabitCategoryId | "";
  isPriority: boolean;
  streakGoal: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDailyTargetChange: (value: string) => void;
  onCategoryChange: (value: HabitCategoryId | "") => void;
  onIsPriorityChange: (value: boolean) => void;
  onStreakGoalChange: (value: string) => void;
}

export function HabitForm({
  locale,
  name,
  description,
  dailyTarget,
  category,
  isPriority,
  streakGoal,
  onNameChange,
  onDescriptionChange,
  onDailyTargetChange,
  onCategoryChange,
  onIsPriorityChange,
  onStreakGoalChange,
}: HabitFormProps) {
  const streakGoalSelectValue = streakGoal === "0" || !streakGoal ? "none" : streakGoal;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">{t("habitName", locale)}</span>
        <Input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder={t("habitName", locale)} />
      </div>
      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">{t("habitDescription", locale)}</span>
        <Textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder={t("habitDescription", locale)}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <span className="text-sm">{t("priority", locale)}</span>
        <Switch checked={isPriority} onCheckedChange={onIsPriorityChange} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">{t("category", locale)}</span>
        <Select
          value={category || "none"}
          onValueChange={(value) => onCategoryChange((value === "none" ? "" : value) as HabitCategoryId)}
        >
          <SelectTrigger className="min-w-[160px]">
            <SelectValue placeholder={t("none", locale)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("none", locale)}</SelectItem>
            {habitCategories.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">{t("streakGoal", locale)}</span>
        <Select
          value={streakGoalSelectValue}
          onValueChange={(value) => onStreakGoalChange(value === "none" ? "0" : value)}
        >
          <SelectTrigger className="min-w-[160px]">
            <SelectValue placeholder={t("none", locale)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("none", locale)}</SelectItem>
            <SelectItem value="7">7</SelectItem>
            <SelectItem value="14">14</SelectItem>
            <SelectItem value="21">21</SelectItem>
            <SelectItem value="30">30</SelectItem>
            <SelectItem value="60">60</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">{t("dailyTarget", locale)}</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={locale === "ru" ? "Уменьшить цель" : "Decrease target"}
            onClick={() => {
              const next = Math.max(1, Number(dailyTarget) - 1);
              onDailyTargetChange(String(next));
            }}
          >
            −
          </Button>
          <Input
            type="number"
            min={1}
            max={50}
            value={dailyTarget}
            onChange={(event) => onDailyTargetChange(event.target.value)}
            className="text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={locale === "ru" ? "Увеличить цель" : "Increase target"}
            onClick={() => {
              const next = Math.min(50, Number(dailyTarget) + 1);
              onDailyTargetChange(String(next));
            }}
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
}
