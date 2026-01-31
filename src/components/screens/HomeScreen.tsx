"use client";

import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Check, Flame, Plus, Star, Tag } from "lucide-react";
import type { Habit, HabitLog, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { getTodayISO } from "@/lib/date";
import { getDisciplineStreakWeeks } from "@/utils/habitUtils";
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

const getFlameCount = (weeks: number) => {
  if (weeks >= 24) return 5;
  if (weeks >= 12) return 4;
  if (weeks >= 8) return 3;
  if (weeks >= 4) return 2;
  if (weeks >= 1) return 1;
  return 0;
};

const getShakeClass = (shake?: "step" | "complete" | "reset" | null) => {
  if (shake === "complete") return "animate-habit-shake-strong";
  if (shake) return "animate-habit-shake";
  return "";
};

// Стабильный пустой массив для предотвращения лишних рендеров
const EMPTY_LOGS: HabitLog[] = [];

const buildLogsByHabit = (logs: HabitLog[]) => {
  const map = new Map<string, HabitLog[]>();
  logs.forEach((log) => {
    const existing = map.get(log.habitId);
    if (existing) {
      map.set(log.habitId, [...existing, log]);
    } else {
      map.set(log.habitId, [log]);
    }
  });
  return map;
};

interface SortableHabitCardProps {
  habit: Habit;
  habitLogs: HabitLog[];
  locale: Locale;
  isDragging: boolean;
  onToggle: (habitId: string, isPriority: boolean, dailyTarget?: number) => void;
  onOpen: (habit: Habit) => void;
  shakeClass: string;
  setShakeMap: (updater: (prev: Record<string, "step" | "complete" | "reset" | null>) => Record<string, "step" | "complete" | "reset" | null>) => void;
}

const SortableHabitCard = memo(function SortableHabitCard({
  habit,
  habitLogs,
  locale,
  isDragging,
  onToggle,
  onOpen,
  shakeClass,
  setShakeMap,
}: SortableHabitCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: habit.id,
    transition: {
      duration: 150,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isSortableDragging ? 9999 : 1,
    position: "relative" as const,
    opacity: isSortableDragging ? 0 : 1,
  };

  const today = getTodayISO();
  const log = habitLogs.find((entry) => entry.date === today);
  const target = Math.max(1, habit.dailyTarget ?? 1);
  const count = Math.min(target, log?.count ?? 0);
  const progress = target ? count / target : 0;
  const done = progress >= 1;
  const streakWeeks = getDisciplineStreakWeeks(habitLogs, habit.id, today);
  const streakFlames = getFlameCount(streakWeeks);
  const Icon = habit.category ? getCategoryMeta(habit.category).icon : Tag;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={shakeClass}
      {...attributes} 
      {...listeners}
    >
      <Card
        className="transition-shadow duration-200 cursor-grab active:cursor-grabbing"
        style={{
          boxShadow: isSortableDragging 
            ? "0 25px 50px rgba(0,0,0,0.35)" 
            : "0 4px 12px rgba(0,0,0,0.08)",
          transform: isSortableDragging ? "scale(1.02)" : "scale(1)",
        }}
      >
        <CardContent>
          <div className="flex items-start gap-3">
            <div 
              className="flex min-w-0 flex-1 items-start gap-3" 
              onClick={() => onOpen(habit)}
            >
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5"
                style={{ color: habit.colorToken }}
              >
                <Icon size={26} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold">{habit.name}</h3>
                {habit.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{habit.description}</p>
                )}
                {(streakFlames > 0 || habit.isPriority) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {streakFlames > 0 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: streakFlames }).map((_, index) => (
                          <Flame key={`flame-${habit.id}-${index}`} size={12} style={{ color: habit.colorToken }} />
                        ))}
                      </div>
                    )}
                    {habit.isPriority && (
                      <Badge variant="secondary" className="gap-1 h-5 text-[10px]">
                        <Star size={10} /> {t("priority", locale)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                const today = getTodayISO();
                const log = habitLogs.find((entry) => entry.date === today);
                const currentCount = log ? log.count ?? 1 : 0;
                const target = Math.max(1, habit.dailyTarget ?? 1);
                let nextShake: "step" | "complete" | "reset" = "step";
                if (!log) {
                  nextShake = "step";
                } else if (currentCount >= target) {
                  nextShake = "reset";
                } else if (currentCount + 1 >= target) {
                  nextShake = "complete";
                }
                if (!log || currentCount < target) {
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
          <div className="mt-2" onClick={() => onOpen(habit)}>
            <Heatmap logs={habitLogs} accent={habit.colorToken} dailyTarget={target} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}, (prev, next) => {
  // Check basic props
  if (prev.habit.id !== next.habit.id) return false;
  if (prev.isDragging !== next.isDragging) return false;
  if (prev.locale !== next.locale) return false;
  
  // Check habit properties that can change in settings
  if (prev.habit.name !== next.habit.name) return false;
  if (prev.habit.description !== next.habit.description) return false;
  if (prev.habit.dailyTarget !== next.habit.dailyTarget) return false;
  if (prev.habit.isPriority !== next.habit.isPriority) return false;
  if (prev.habit.colorToken !== next.habit.colorToken) return false;
  if (prev.habit.category !== next.habit.category) return false;
  
  // Check logs
  if (prev.habitLogs.length !== next.habitLogs.length) return false;
  for (let i = 0; i < prev.habitLogs.length; i++) {
    const prevLog = prev.habitLogs[i];
    const nextLog = next.habitLogs[i];
    if (prevLog.date !== nextLog.date || prevLog.count !== nextLog.count || prevLog.status !== nextLog.status) {
      return false;
    }
  }
  return true;
});

const HomeScreen = ({ locale, habits, logs, onToggle, onOpen, onAdd, onReorderHabits }: HomeScreenProps) => {
  const [orderedHabits, setOrderedHabits] = useState(habits);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shakeMap, setShakeMap] = useState<Record<string, "step" | "complete" | "reset" | null>>({});

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
  }, [habits]);

  const normalizePriority = (next: Habit[]) => {
    const priority = next.filter((habit) => habit.isPriority);
    const normal = next.filter((habit) => !habit.isPriority);
    return [...priority, ...normal];
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const root = document.querySelector<HTMLDivElement>(".app-root");
    if (root) {
      root.style.overflow = "hidden";
      root.style.touchAction = "none";
    }
    vibrationFeedback.dragStart();
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    const root = document.querySelector<HTMLDivElement>(".app-root");
    if (root) {
      root.style.overflow = "";
      root.style.touchAction = "";
    }

    if (over && active.id !== over.id) {
      const oldIndex = orderedHabits.findIndex((item) => item.id === active.id);
      const newIndex = orderedHabits.findIndex((item) => item.id === over.id);
      const newOrder = arrayMove(orderedHabits, oldIndex, newIndex);
      const normalized = normalizePriority(newOrder);
      
      setOrderedHabits(normalized);
      
      // Отправляем обновление порядка
      const ids = normalized.map((habit) => habit.id);
      const currentIds = habits.map((habit) => habit.id);
      if (ids.join("|") !== currentIds.join("|")) {
        onReorderHabits(ids);
      }
      
      vibrationFeedback.dropSuccess();
    }
  }, [orderedHabits, habits, onReorderHabits]);

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0",
        },
      },
    }),
  };

  const activeHabit = activeId ? orderedHabits.find((h) => h.id === activeId) : null;
  const activeHabitLogs = activeId ? logsByHabit.get(activeId) ?? EMPTY_LOGS : EMPTY_LOGS;

  const today = getTodayISO();
  const activeLog = activeHabit ? activeHabitLogs.find((entry) => entry.date === today) : null;
  const activeTarget = activeHabit ? Math.max(1, activeHabit.dailyTarget ?? 1) : 1;
  const activeCount = activeHabit ? Math.min(activeTarget, activeLog?.count ?? 0) : 0;
  const activeProgress = activeTarget ? activeCount / activeTarget : 0;
  const activeDone = activeProgress >= 1;
  const activeStreakWeeks = activeHabit ? getDisciplineStreakWeeks(activeHabitLogs, activeHabit.id, today) : 0;
  const activeStreakFlames = getFlameCount(activeStreakWeeks);

  if (habits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("habits", locale)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("emptyHabits", locale)}</p>
          <Button className="mt-4" onClick={onAdd} type="button">
            {t("addHabit", locale)}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={orderedHabits.map(h => h.id)} strategy={verticalListSortingStrategy}>
        <div className="grid gap-4">
          {orderedHabits.map((habit) => {
            const habitLogs = logsByHabit.get(habit.id) ?? EMPTY_LOGS;
            const shake = shakeMap[habit.id];
            const shakeClass = getShakeClass(shake);
            return (
              <SortableHabitCard
                key={habit.id}
                habit={habit}
                habitLogs={habitLogs}
                locale={locale}
                isDragging={activeId === habit.id}
                onToggle={onToggle}
                onOpen={onOpen}
                shakeClass={shakeClass}
                setShakeMap={setShakeMap}
              />
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeHabit ? (
          <Card
            style={{
              boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
              transform: "scale(1.03)",
            }}
          >
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5"
                    style={{ color: activeHabit.colorToken }}
                  >
                    {(() => {
                      const IconComponent = activeHabit.category ? getCategoryMeta(activeHabit.category).icon : Tag;
                      return <IconComponent size={26} />;
                    })()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold">{activeHabit.name}</h3>
                    {activeHabit.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{activeHabit.description}</p>
                    )}
                    {(activeStreakFlames > 0 || activeHabit.isPriority) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {activeStreakFlames > 0 && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: activeStreakFlames }).map((_, index) => (
                              <Flame key={`drag-flame-${activeHabit.id}-${index}`} size={12} style={{ color: activeHabit.colorToken }} />
                            ))}
                          </div>
                        )}
                        {activeHabit.isPriority && (
                          <Badge variant="secondary" className="gap-1 h-5 text-[10px]">
                            <Star size={10} /> {t("priority", locale)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  type="button"
                >
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(${activeHabit.colorToken} ${activeProgress}turn, hsl(var(--muted)) 0)`,
                      mask: "radial-gradient(circle at center, transparent 58%, black 60%)",
                      boxShadow: "inset 0 0 0 1px hsl(var(--border))",
                    }}
                  />
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-transform ${
                      activeDone ? "text-white" : ""
                    }`}
                    style={{
                      background: activeDone ? activeHabit.colorToken : "hsl(var(--muted))",
                      color: activeDone ? "#fff" : activeHabit.colorToken,
                      transform: activeDone ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    {activeTarget > 1 && !activeDone ? <Plus size={14} /> : <Check size={14} />}
                  </span>
                </button>
              </div>
              <div className="mt-2">
                <Heatmap logs={activeHabitLogs} accent={activeHabit.colorToken} dailyTarget={activeTarget} />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default HomeScreen;
