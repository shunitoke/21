import type { AllyTone, Habit, HabitLog } from "@/lib/types";
import { getTodayISO } from "@/lib/date";

interface HabitProgress {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completedHabits: Habit[];
  pendingHabits: Habit[];
}

function getHabitProgress(habits: Habit[], logs: HabitLog[]): HabitProgress {
  const today = getTodayISO();
  const activeHabits = habits.filter((h) => !h.archived);
  const todayLogs = logs.filter((log) => log.date === today && log.status === "done");
  const logsByHabit = new Map<string, number>();

  for (const log of todayLogs) {
    logsByHabit.set(log.habitId, (logsByHabit.get(log.habitId) ?? 0) + (log.count ?? 1));
  }

  let completed = 0;
  let inProgress = 0;
  const completedHabits: Habit[] = [];
  const pendingHabits: Habit[] = [];

  for (const habit of activeHabits) {
    const count = logsByHabit.get(habit.id) ?? 0;
    const target = habit.dailyTarget ?? 1;

    if (count >= target) {
      completed++;
      completedHabits.push(habit);
    } else if (count > 0) {
      inProgress++;
      pendingHabits.push(habit);
    } else {
      pendingHabits.push(habit);
    }
  }

  return {
    total: activeHabits.length,
    completed,
    inProgress,
    notStarted: activeHabits.length - completed - inProgress,
    completedHabits,
    pendingHabits,
  };
}

const reminderMessages: Record<AllyTone, string[]> = {
  friend: [
    "Есть время для привычек?",
    "Как дела с планом на сегодня?",
    "Напоминаю: маленькие шаги ведут к большому результату.",
    "Есть минутка? Можно закрыть пару дел.",
    "Сегодня отличный день, чтобы двигаться вперёд.",
  ],
  coach: [
    "Время действовать.",
    "Проверь свой список.",
    "Дисциплина превыше всего.",
    "Не откладывай на потом.",
    "Сфокусируйся. Выполни задачу.",
  ],
};

const progressMessages: Record<AllyTone, { partial: string[]; good: string[]; excellent: string[] }> = {
  friend: {
    partial: [
      "Уже {completed} из {total}. Продолжай в том же духе.",
      "Хорошее начало. {pending} ещё ждут тебя.",
      "Ты на полпути. Осталось совсем немного.",
    ],
    good: [
      "{completed} из {total} — отличный прогресс!",
      "Ты молодец. Осталось буквально пару дел.",
      "Почти всё. Можно закрыть день красиво.",
    ],
    excellent: [
      "Всё выполнено! Сегодня был продуктивный день.",
      "Отличная работа. Можно отдыхать.",
      "Ты справился со всем. Горжусь тобой!",
    ],
  },
  coach: {
    partial: [
      "{completed} из {total}. Добей остальное.",
      "Неплохо, но можно лучше. {pending} в работе.",
      "На полпути. Не останавливайся.",
    ],
    good: [
      "{completed} из {total}. Система работает.",
      "Хороший темп. Закрывай остатки.",
      "Почти цель. Доделай и отдыхай.",
    ],
    excellent: [
      "100% выполнения. Дисциплина на высоте.",
      "День закрыт. Ритм сохранён.",
      "Миссия выполнена. Отличная работа.",
    ],
  },
};

const habitSpecificMessages: Record<AllyTone, string[]> = {
  friend: [
    "Не забудь про {habitName} — это важно для тебя.",
    "{habitName} ждёт. Всего несколько минут.",
    "Как насчёт {habitName}? Ты можешь это.",
  ],
  coach: [
    "{habitName} — выполни сейчас.",
    "Закрой {habitName}. Без отговорок.",
    "{habitName} в приоритете. Действуй.",
  ],
};

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function formatMessage(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? key));
}

export function generateNotificationMessage(
  ally: AllyTone,
  habits: Habit[],
  logs: HabitLog[]
): { title: string; body: string } {
  const progress = getHabitProgress(habits, logs);
  const hour = new Date().getHours();

  // All done
  if (progress.completed === progress.total && progress.total > 0) {
    return {
      title: ally === "friend" ? "Отличный день!" : "Цель достигнута",
      body: randomFrom(progressMessages[ally].excellent),
    };
  }

  // Nothing started yet, morning reminder
  if (progress.completed === 0 && progress.inProgress === 0 && hour < 12) {
    return {
      title: ally === "friend" ? "Доброе утро!" : "Начни день",
      body: randomFrom(reminderMessages[ally]),
    };
  }

  // Specific pending habit (if any)
  if (progress.pendingHabits.length > 0 && Math.random() < 0.5) {
    const habit = randomFrom(progress.pendingHabits);
    return {
      title: ally === "friend" ? "Напоминание" : "Задача",
      body: formatMessage(randomFrom(habitSpecificMessages[ally]), { habitName: habit.name }),
    };
  }

  // Progress-based message
  const ratio = progress.total > 0 ? progress.completed / progress.total : 0;
  let pool: string[];

  if (ratio < 0.4) {
    pool = progressMessages[ally].partial;
  } else if (ratio < 0.8) {
    pool = progressMessages[ally].good;
  } else {
    pool = progressMessages[ally].good;
  }

  return {
    title: ally === "friend" ? "Как идёт день?" : "Прогресс",
    body: formatMessage(randomFrom(pool), {
      completed: progress.completed,
      total: progress.total,
      pending: progress.pendingHabits.length,
    }),
  };
}
