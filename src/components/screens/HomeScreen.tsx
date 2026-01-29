"use client";

import { Reorder, useDragControls } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type React } from "react";
import { Check, Flame, Plus, Star, Tag } from "lucide-react";
import type { Habit, HabitLog, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { getTodayISO } from "@/lib/date";
import { getCategoryMeta } from "@/lib/categories";
import Heatmap from "@/components/Heatmap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { vibrationFeedback } from "@/utils/vibrationUtils";

interface HomeScreenProps {
  locale: Locale;
  habits: Habit[];
  logs: HabitLog[];
  onToggle: (habitId: string, isPriority: boolean, dailyTarget?: number) => void;
  onOpen: (habit: Habit) => void;
  onAdd: () => void;
  onReorderHabits: (orderedIds: string[]) => void;
}

const getCurrentStreak = (dates: string[], today: string) => {
  if (!dates.length) return 0;
  const unique = Array.from(new Set(dates)).sort();
  let streak = 0;
  let cursor = new Date(today);
  for (let i = unique.length - 1; i >= 0; i -= 1) {
    const current = new Date(unique[i]);
    const diff = (cursor.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 0 || diff === 1) {
      streak += 1;
      cursor = current;
    } else {
      break;
    }
  }
  return streak;
};

const getShakeClass = (shake?: "step" | "complete" | "reset" | null) => {
  if (shake === "complete") return "animate-habit-shake-strong";
  if (shake) return "animate-habit-shake";
  return "";
};

const buildLogsByHabit = (logs: HabitLog[]) => {
  const map = new Map<string, HabitLog[]>();
  logs.forEach((log) => {
    const list = map.get(log.habitId) ?? [];
    list.push(log);
    map.set(log.habitId, list);
  });
  return map;
};

const getToggleState = (log: HabitLog | undefined, target: number) => {
  const currentCount = log ? log.count ?? 1 : 0;
  let nextCount = 0;
  let nextShake: "step" | "complete" | "reset" = "step";

  if (!log) {
    nextCount = 1;
  } else if (currentCount >= target) {
    nextCount = 0;
    nextShake = "reset";
  } else {
    nextCount = currentCount + 1;
  }

  if (nextCount >= target && nextCount > 0) {
    nextShake = "complete";
  }

  return { nextCount, nextShake };
};

const HomeScreen = ({ locale, habits, logs, onToggle, onOpen, onAdd, onReorderHabits }: HomeScreenProps) => {
  const [shakeMap, setShakeMap] = useState<Record<string, "step" | "complete" | "reset" | null>>({});
  const [orderedHabits, setOrderedHabits] = useState(habits);
  const [draggingHabitId, setDraggingHabitId] = useState<string | null>(null);
  const pendingOrderRef = useRef(habits);
  const dragBlockRef = useRef(false);
  const dragTimeoutRef = useRef<number | null>(null);
  const cardDelayRef = useRef(new Map<string, number>());

  const logsByHabit = useMemo(() => buildLogsByHabit(logs), [logs]);

  useEffect(() => {
    const timeouts: Array<ReturnType<typeof setTimeout>> = [];
    Object.entries(shakeMap).forEach(([habitId, value]) => {
      if (!value) return;
      timeouts.push(
        setTimeout(() => {
          setShakeMap((prev) => ({ ...prev, [habitId]: null }));
        }, 320)
      );
    });
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [shakeMap]);

  useEffect(() => {
    setOrderedHabits(habits);
    pendingOrderRef.current = habits;
  }, [habits]);

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) window.clearTimeout(dragTimeoutRef.current);
    };
  }, []);

  const normalizePriority = (next: Habit[]) => {
    const priority = next.filter((habit) => habit.isPriority);
    const normal = next.filter((habit) => !habit.isPriority);
    return [...priority, ...normal];
  };

  const blockClick = () => {
    dragBlockRef.current = true;
    if (dragTimeoutRef.current) window.clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = window.setTimeout(() => {
      dragBlockRef.current = false;
    }, 180);
  };

  const HabitReorderItem = ({
    habit,
    habitLogs,
    log,
    target,
    progress,
    done,
    streakFlames,
    Icon,
    shakeClass,
    delay,
  }: {
    habit: Habit;
    habitLogs: HabitLog[];
    log: HabitLog | undefined;
    target: number;
    progress: number;
    done: boolean;
    streakFlames: number;
    Icon: typeof Tag;
    shakeClass: string;
    delay: number;
  }) => {
    const dragControls = useDragControls();
    const holdTimeoutRef = useRef<number | null>(null);
    const pressPointRef = useRef<{ x: number; y: number } | null>(null);
    const pointerEventRef = useRef<globalThis.PointerEvent | null>(null);

    const clearHoldTimeout = () => {
      if (holdTimeoutRef.current) {
        window.clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLLIElement>) => {
      clearHoldTimeout();
      pressPointRef.current = { x: event.clientX, y: event.clientY };
      pointerEventRef.current = event.nativeEvent as globalThis.PointerEvent;
      event.currentTarget.setPointerCapture(event.pointerId);
      holdTimeoutRef.current = window.setTimeout(() => {
        if (pointerEventRef.current) {
          dragControls.start(pointerEventRef.current);
        }
      }, 180);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLLIElement>) => {
      if (!pressPointRef.current) return;
      const dx = Math.abs(event.clientX - pressPointRef.current.x);
      const dy = Math.abs(event.clientY - pressPointRef.current.y);
      if (dx > 8 || dy > 8) {
        clearHoldTimeout();
        pressPointRef.current = null;
        pointerEventRef.current = null;
      }
    };

    const handlePointerEnd = () => {
      clearHoldTimeout();
      pressPointRef.current = null;
      pointerEventRef.current = null;
    };

    return (
      <Reorder.Item
        className={`grid cursor-grab gap-4 ${shakeClass}`}
        key={habit.id}
        value={habit}
        layout
        drag
        dragControls={dragControls}
        dragListener={false}
        dragElastic={0.18}
        dragMomentum={false}
        style={{ boxShadow: draggingHabitId === habit.id ? "0 18px 40px rgba(0,0,0,0.2)" : "none" }}
        initial={{ opacity: 0.25, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 28,
          delay,
          layout: { type: "spring", stiffness: 520, damping: 38 },
        }}
        whileDrag={{ scale: 1.02, cursor: "grabbing" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onDragStart={() => {
          blockClick();
          setDraggingHabitId(habit.id);
          vibrationFeedback.dragStart();
        }}
        onDragEnd={() => {
          blockClick();
          vibrationFeedback.dropSuccess();
          setDraggingHabitId(null);
          commitOrder(pendingOrderRef.current);
        }}
        onClick={() => {
          if (dragBlockRef.current) return;
          onOpen(habit);
        }}
      >
        <Card>
          <CardContent>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5"
                  style={{ color: habit.colorToken }}
                >
                  <Icon size={22} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">{habit.name}</h3>
                  {habit.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{habit.description}</p>
                  )}
                  {(streakFlames > 0 || habit.isPriority) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {streakFlames > 0 && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: streakFlames }).map((_, index) => (
                            <Flame key={`flame-${habit.id}-${index}`} size={14} style={{ color: habit.colorToken }} />
                          ))}
                        </div>
                      )}
                      {habit.isPriority && (
                        <Badge variant="secondary" className="gap-1">
                          <Star size={12} /> {t("priority", locale)}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full"
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  const { nextCount, nextShake } = getToggleState(log, target);

                  if (nextCount >= target && nextCount > 0) {
                    if (habit.isPriority) {
                      vibrationFeedback.priorityHabitComplete();
                    } else {
                      vibrationFeedback.habitComplete();
                    }
                  } else {
                    vibrationFeedback.buttonPress();
                  }

                  setShakeMap((prev) => ({ ...prev, [habit.id]: nextShake }));
                  onToggle(habit.id, habit.isPriority, target);
                }}
              >
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${habit.colorToken} ${progress}turn, hsl(var(--muted)) 0)`,
                    mask: "radial-gradient(circle at center, transparent 58%, black 60%)",
                    boxShadow: "inset 0 0 0 1px hsl(var(--border))",
                  }}
                />
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-transform ${
                    done ? "text-white" : ""
                  }`}
                  style={{
                    background: done ? habit.colorToken : "hsl(var(--muted))",
                    color: done ? "#fff" : habit.colorToken,
                    transform: done ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  {target > 1 && !done ? <Plus size={14} /> : <Check size={14} />}
                </span>
              </button>
            </div>
            <div className="mt-6">
              <Heatmap logs={habitLogs} accent={habit.colorToken} dailyTarget={target} />
            </div>
          </CardContent>
        </Card>
      </Reorder.Item>
    );
  };

  const commitOrder = (nextOrder: Habit[]) => {
    const ids = nextOrder.map((habit) => habit.id);
    const currentIds = habits.map((habit) => habit.id);
    if (ids.length === 0 || ids.join("|") === currentIds.join("|")) return;
    onReorderHabits(ids);
  };

  return (
    <Reorder.Group
      axis="y"
      values={orderedHabits}
      onReorder={(next) => {
        const normalized = normalizePriority(next);
        setOrderedHabits(normalized);
        pendingOrderRef.current = normalized;
      }}
      as="div"
      className="grid gap-4"
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      {habits.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("habits", locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("emptyHabits", locale)}
            </p>
            <Button className="mt-4" onClick={onAdd} type="button">
              {t("addHabit", locale)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        orderedHabits.map((habit) => {
          const today = getTodayISO();
          const habitLogs = logsByHabit.get(habit.id) ?? [];
          const log = habitLogs.find((entry) => entry.date === today);
          const target = Math.max(1, habit.dailyTarget ?? 1);
          const count = Math.min(target, log?.count ?? 0);
          const progress = target ? count / target : 0;
          const done = progress >= 1;
          const doneDates = habitLogs.filter((entry) => entry.status === "done").map((entry) => entry.date);
          const streakCount = getCurrentStreak(doneDates, today);
          const streakFlames = Math.min(5, streakCount);
          const Icon = habit.category ? getCategoryMeta(habit.category).icon : Tag;
          const shake = shakeMap[habit.id];
          const shakeClass = getShakeClass(shake);
          const delay = (() => {
            const existing = cardDelayRef.current.get(habit.id);
            if (existing !== undefined) return existing;
            const next = 0.04 + Math.random() * 0.18;
            cardDelayRef.current.set(habit.id, next);
            return next;
          })();

          return (
            <HabitReorderItem
              key={habit.id}
              habit={habit}
              habitLogs={habitLogs}
              log={log}
              target={target}
              progress={progress}
              done={done}
              streakFlames={streakFlames}
              Icon={Icon}
              shakeClass={shakeClass}
              delay={delay}
            />
          );
        })
      )}
    </Reorder.Group>
  );
};

export default HomeScreen;
