"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Archive } from "lucide-react";
import type { Habit, HabitCategoryId, HabitLog, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { habitCategories } from "@/lib/categories";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitForm } from "@/components/habit/HabitForm";
import { HabitCalendar } from "@/components/habit/HabitCalendar";
import { QuickEntry } from "@/components/habit/QuickEntry";

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

const buildLogSignature = (entries: HabitLog[]) =>
  entries
    .map((entry) => `${entry.date}:${entry.count ?? 1}`)
    .sort()
    .join("|");

export default function HabitModal({
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
}: HabitModalProps) {
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
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const targetValue = useMemo(() => {
    const parsed = Number.parseInt(dailyTarget, 10);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return Math.min(parsed, 50);
  }, [dailyTarget]);

  const streakValue = useMemo(() => {
    const parsed = Number.parseInt(streakGoal, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return parsed;
  }, [streakGoal]);

  const streakGoalValue = streakGoal || "0";

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

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      dailyTarget: targetValue,
      category: category || null,
      isPriority,
      streakGoal: streakValue,
    });
  };

  if (!open) return null;

  const title = habit ? t("editHabitTitle", locale) : t("addHabitTitle", locale);

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
              <TabsTrigger value="settings">{t("settingsTitle", locale)}</TabsTrigger>
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
                    <HabitCalendar
                      habit={habit}
                      logs={logs}
                      locale={locale}
                      month={detailMonth}
                      selectedDate={selectedDate}
                      targetValue={targetValue}
                      onMonthChange={setDetailMonth}
                      onSelectDate={setSelectedDate}
                      onToggleDate={onToggleDate || (() => {})}
                    />
                    <QuickEntry
                      habitId={habit.id}
                      selectedDate={selectedDate}
                      logs={logs}
                      targetValue={targetValue}
                      locale={locale}
                      colorToken={habit.colorToken}
                      onSetDate={onSetDate || (() => {})}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="settings"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <HabitForm
                      locale={locale}
                      name={name}
                      description={description}
                      dailyTarget={dailyTarget}
                      category={category}
                      isPriority={isPriority}
                      streakGoal={streakGoal}
                      onNameChange={setName}
                      onDescriptionChange={setDescription}
                      onDailyTargetChange={setDailyTarget}
                      onCategoryChange={setCategory}
                      onIsPriorityChange={setIsPriority}
                      onStreakGoalChange={setStreakGoal}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Tabs>
        ) : (
          <HabitForm
            locale={locale}
            name={name}
            description={description}
            dailyTarget={dailyTarget}
            category={category}
            isPriority={isPriority}
            streakGoal={streakGoal}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onDailyTargetChange={setDailyTarget}
            onCategoryChange={setCategory}
            onIsPriorityChange={setIsPriority}
            onStreakGoalChange={setStreakGoal}
          />
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
          <Button type="button" disabled={!canSave} onClick={handleSubmit}>
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
}
