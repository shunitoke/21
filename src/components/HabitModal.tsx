"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Habit, HabitCategoryId, HabitLog, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { getCategoryColor, habitCategories, hexToRgba } from "@/lib/categories";
import { toISODate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import type { DayButton } from "react-day-picker";
import { ru } from "date-fns/locale";
import { Archive } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { vibrationFeedback, triggerVibration } from "@/utils/vibrationUtils";

interface HabitModalProps {
  open: boolean;
  locale: Locale;
  habit?: Habit | null;
  logs: HabitLog[];
  onClose: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onToggleDate?: (habitId: string, date: string, target: number) => void;
  onSetDate?: (habitId: string, date: string, count: number) => void;
  onSubmit: (payload: {
    name: string;
    description?: string;
    dailyTarget: number;
    category?: HabitCategoryId | null;
    isPriority: boolean;
    streakGoal?: number | null;
  }) => void;
}

const HabitModal = ({
  open,
  locale,
  habit,
  logs,
  onClose,
  onArchive,
  onDelete,
  onToggleDate,
  onSetDate,
  onSubmit,
}: HabitModalProps) => {
  const initialStateRef = useRef<{
    name: string;
    description: string;
    dailyTarget: string;
    category: HabitCategoryId | "";
    isPriority: boolean;
    streakGoal: string;
  } | null>(null);
  const initialLogSignatureRef = useRef<string>("");
  const initKeyRef = useRef<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dailyTarget, setDailyTarget] = useState("1");
  const [category, setCategory] = useState<HabitCategoryId | "">("");
  const [isPriority, setIsPriority] = useState(false);
  const [streakGoal, setStreakGoal] = useState("0");
  const [activeTab, setActiveTab] = useState<"settings" | "calendar">("settings");
  const [detailMonth, setDetailMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("0");
  const [quickEntryDirty, setQuickEntryDirty] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const buildLogSignature = (entries: HabitLog[]) =>
    entries
      .map((entry) => `${entry.date}:${entry.count ?? 1}`)
      .sort()
      .join("|");

  useEffect(() => {
    if (open) return;
    initKeyRef.current = "";
    initialStateRef.current = null;
    initialLogSignatureRef.current = "";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const initKey = `${habit?.id ?? "new"}:${open ? "open" : "closed"}`;
    if (initKeyRef.current === initKey) return;
    initKeyRef.current = initKey;

    const normalizedStreak = Number.isFinite(Number(habit?.streakGoal)) && Number(habit?.streakGoal) > 0
      ? String(habit?.streakGoal)
      : "0";
    const normalizedDailyTarget = String(habit?.dailyTarget ?? 1);
    const normalizedCategory = habit?.category ?? "";

    setName(habit?.name ?? "");
    setDescription(habit?.description ?? "");
    setDailyTarget(normalizedDailyTarget);
    setCategory(normalizedCategory);
    setIsPriority(Boolean(habit?.isPriority));
    setStreakGoal(normalizedStreak);
    setActiveTab(habit ? "calendar" : "settings");
    setSelectedDate(null);
    setInputValue("0");

    initialStateRef.current = {
      name: habit?.name ?? "",
      description: habit?.description ?? "",
      dailyTarget: normalizedDailyTarget,
      category: normalizedCategory,
      isPriority: Boolean(habit?.isPriority),
      streakGoal: normalizedStreak,
    };

    initialLogSignatureRef.current = habit
      ? buildLogSignature(logs.filter((log) => log.habitId === habit.id))
      : "";
  }, [habit, logs, open]);

  const title = habit ? t("editHabitTitle", locale) : t("addHabitTitle", locale);

  const targetValue = useMemo(() => {
    const parsed = Number.parseInt(dailyTarget, 10);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return Math.min(parsed, 50);
  }, [dailyTarget]);

  const HabitCalendarDayButton = useMemo(() => {
    if (!habit) return undefined;

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
          onClick={(event) => {
            buttonProps.onClick?.(event);
            vibrationFeedback.buttonPress();
          }}
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

  const streakValue = useMemo(() => {
    const parsed = Number.parseInt(streakGoal, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return parsed;
  }, [streakGoal]);

  const streakGoalValue = streakGoal || "0";
  const streakGoalSelectValue = streakGoalValue === "0" ? "none" : streakGoalValue;

  const isDirty = useMemo(() => {
    if (!initialStateRef.current) return false;
    const initial = initialStateRef.current;
    const currentLogSignature = habit
      ? buildLogSignature(logs.filter((log) => log.habitId === habit.id))
      : "";

    const formDirty =
      name !== initial.name ||
      description !== initial.description ||
      dailyTarget !== initial.dailyTarget ||
      category !== initial.category ||
      isPriority !== initial.isPriority ||
      streakGoalValue !== initial.streakGoal;

    const calendarDirty = habit
      ? currentLogSignature !== initialLogSignatureRef.current
      : false;

    return formDirty || calendarDirty;
  }, [category, dailyTarget, description, habit, isPriority, logs, name, streakGoalValue]);

  const canSubmit = name.trim().length > 1;
  const canSave = canSubmit && isDirty;

  const selectedDay = useMemo(() => {
    if (!selectedDate) return undefined;
    return new Date(`${selectedDate}T00:00:00`);
  }, [selectedDate]);

  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    const activeLog = logs.find((log) => log.date === selectedDate);
    setInputValue(String(activeLog?.count ?? 0));
    setQuickEntryDirty(false);
  }, [selectedDate, logs]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="max-w-[520px] gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{t("dialogDetails", locale)}</DialogDescription>
        </DialogHeader>

        {habit ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "settings" | "calendar")}> 
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calendar">{t("calendar", locale)}</TabsTrigger>
              <TabsTrigger value="settings">
                {t("settingsTitle", locale)}
              </TabsTrigger>
            </TabsList>
            <div className="relative mt-3">
              <AnimatePresence mode="wait" initial={false}>
                {activeTab === "calendar" ? (
                  <motion.div
                    key="calendar"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    <Calendar
                      mode="single"
                      month={detailMonth}
                      selected={selectedDay}
                      locale={locale === "ru" ? ru : undefined}
                      formatters={{
                        formatCaption: (date) =>
                          date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
                            month: "long",
                            year: "numeric",
                          }),
                      }}
                      components={
                        HabitCalendarDayButton
                          ? {
                              DayButton: HabitCalendarDayButton,
                            }
                          : undefined
                      }
                      onSelect={(value) => {
                        if (!value) return;
                        setSelectedDate(toISODate(value));
                      }}
                      onDayClick={(day) => {
                        if (!habit) return;
                        const iso = toISODate(day);
                        setSelectedDate(iso);
                        onToggleDate?.(habit.id, iso, targetValue);
                        vibrationFeedback.priorityHabitComplete();
                      }}
                      onMonthChange={setDetailMonth}
                      disabled={{ after: today }}
                      weekStartsOn={1}
                      className="w-full max-w-full"
                    />
                    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t("quickEntry", locale)}</span>
                        {selectedDate && <span style={{ color: habit?.colorToken }}>{selectedDate}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={!selectedDate}
                          aria-label={locale === "ru" ? "Уменьшить" : "Decrease"}
                          onClick={() => {
                            if (!habit || !selectedDate) return;
                            const nextValue = Math.max(0, Number(inputValue) - 1);
                            setInputValue(String(nextValue));
                            setQuickEntryDirty(false);
                            onSetDate?.(habit.id, selectedDate, nextValue);
                          }}
                        >
                          −
                        </Button>
                        <Input
                          value={inputValue}
                          type="number"
                          min={0}
                          max={targetValue}
                          disabled={!selectedDate}
                          onChange={(event) => {
                            setInputValue(event.target.value);
                            setQuickEntryDirty(true);
                          }}
                          onBlur={() => {
                            if (!habit || !selectedDate) return;
                            const nextValue = Math.max(0, Math.min(targetValue, Number(inputValue) || 0));
                            setInputValue(String(nextValue));
                            onSetDate?.(habit.id, selectedDate, nextValue);
                            setQuickEntryDirty(false);
                          }}
                          className="h-9 w-[84px] text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={!selectedDate}
                          aria-label={locale === "ru" ? "Увеличить" : "Increase"}
                          onClick={() => {
                            if (!habit || !selectedDate) return;
                            const nextValue = Math.min(targetValue, Number(inputValue) + 1);
                            setInputValue(String(nextValue));
                            setQuickEntryDirty(false);
                            onSetDate?.(habit.id, selectedDate, nextValue);
                          }}
                        >
                          +
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          disabled={!selectedDate || !quickEntryDirty}
                          aria-label={t("save", locale)}
                          onClick={() => {
                            if (!habit || !selectedDate) return;
                            const nextValue = Math.max(0, Math.min(targetValue, Number(inputValue) || 0));
                            setInputValue(String(nextValue));
                            onSetDate?.(habit.id, selectedDate, nextValue);
                            setQuickEntryDirty(false);
                          }}
                        >
                          ✓
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="settings"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-3"
                  >
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">{t("habitName", locale)}</span>
                      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("habitName", locale)} />
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">{t("habitDescription", locale)}</span>
                      <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder={t("habitDescription", locale)}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <span className="text-sm">{t("priority", locale)}</span>
                      <Switch checked={isPriority} onCheckedChange={setIsPriority} />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{t("category", locale)}</span>
                      <Select
                        value={category || "none"}
                        onValueChange={(value) => setCategory((value === "none" ? "" : value) as HabitCategoryId)}
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
                        onValueChange={(value) => setStreakGoal(value === "none" ? "0" : value)}
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
                            setDailyTarget(String(next));
                          }}
                        >
                          −
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={dailyTarget}
                          onChange={(event) => setDailyTarget(event.target.value)}
                          className="text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={locale === "ru" ? "Увеличить цель" : "Increase target"}
                          onClick={() => {
                            const next = Math.min(50, Number(dailyTarget) + 1);
                            setDailyTarget(String(next));
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Tabs>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">{t("habitName", locale)}</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("habitName", locale)} />
            </div>
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">{t("habitDescription", locale)}</span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("habitDescription", locale)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">{t("priority", locale)}</span>
              <Switch checked={isPriority} onCheckedChange={setIsPriority} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{t("category", locale)}</span>
              <Select
                value={category || "none"}
                onValueChange={(value) => setCategory((value === "none" ? "" : value) as HabitCategoryId)}
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
                onValueChange={(value) => setStreakGoal(value === "none" ? "0" : value)}
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
                    setDailyTarget(String(next));
                  }}
                >
                  −
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={dailyTarget}
                  onChange={(event) => setDailyTarget(event.target.value)}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={locale === "ru" ? "Увеличить цель" : "Increase target"}
                  onClick={() => {
                    const next = Math.min(50, Number(dailyTarget) + 1);
                    setDailyTarget(String(next));
                  }}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center gap-2">
            {habit && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("archive", locale)}
                disabled={!onArchive}
                onClick={() => setArchiveConfirmOpen(true)}
              >
                <Archive size={16} />
              </Button>
            )}
            <Button variant="outline" onClick={onClose} type="button">
              {t("cancel", locale)}
            </Button>
          </div>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                dailyTarget: targetValue,
                category: category || null,
                isPriority,
                streakGoal: streakValue,
              })
            }
          >
            {t("save", locale)}
          </Button>
        </DialogFooter>

        <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <AlertDialogContent className="max-w-[420px]">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("archiveConfirmTitle", locale)}</AlertDialogTitle>
              <AlertDialogDescription>{t("archiveConfirmDescription", locale)}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel", locale)}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setArchiveConfirmOpen(false);
                  onArchive?.();
                }}
              >
                {t("archive", locale)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default HabitModal;
