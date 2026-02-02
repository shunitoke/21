import type { Habit, HabitLog, JournalEntry, StopCraneItem, UserSettings } from "@/lib/types";
import { getCategoryColor } from "@/lib/categories";
import { getPastDays } from "@/lib/date";
import { detectSystemLocale } from "@/utils/locale";

export const defaultSettings: UserSettings = {
  id: "settings",
  locale: detectSystemLocale(),
  theme: "system",
  ally: "friend",
  demoMode: true,
  tutorialCompleted: false,
  notificationSettings: {
    enabled: false,
    frequency: "normal",
    startHour: 9,
    endHour: 22,
  },
};

export const demoSettings: UserSettings = {
  id: "settings",
  locale: "ru",
  theme: "system",
  ally: "friend",
  demoMode: true,
  tutorialCompleted: false,
  notificationSettings: {
    enabled: false,
    frequency: "normal",
    startHour: 9,
    endHour: 22,
  },
};

export const defaultHabits: Habit[] = [];
export const defaultStopCrane: StopCraneItem[] = [];
export const defaultJournal: JournalEntry[] = [];

export const demoHabits: Habit[] = [
  {
    id: "demo-walk",
    name: "Утренняя прогулка",
    description: "15 минут без телефона",
    colorToken: getCategoryColor("health"),
    order: 0,
    isPriority: true,
    streakGoal: 120,
    remindersPerDay: 1,
    category: "health",
    trackingMode: "step",
    dailyTarget: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-focus",
    name: "Глубокая работа",
    description: "3 блока по 45 минут",
    colorToken: getCategoryColor("work"),
    order: 1,
    isPriority: true,
    streakGoal: 80,
    remindersPerDay: 2,
    category: "work",
    trackingMode: "custom",
    dailyTarget: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-reading",
    name: "Чтение",
    description: "30 страниц в день",
    colorToken: getCategoryColor("learning"),
    order: 2,
    isPriority: true,
    streakGoal: 60,
    remindersPerDay: 1,
    category: "learning",
    trackingMode: "step",
    dailyTarget: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-meditation",
    name: "Медитация",
    description: "15 минут тишины",
    colorToken: getCategoryColor("mindset"),
    order: 3,
    isPriority: true,
    streakGoal: 40,
    remindersPerDay: 1,
    category: "mindset",
    trackingMode: "step",
    dailyTarget: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-creativity",
    name: "Идеи",
    description: "5 заметок в день",
    colorToken: getCategoryColor("creativity"),
    order: 4,
    isPriority: false,
    streakGoal: 25,
    remindersPerDay: 1,
    category: "creativity",
    trackingMode: "custom",
    dailyTarget: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-family",
    name: "Контакт с близкими",
    description: "2 сообщения или звонка",
    colorToken: getCategoryColor("family"),
    order: 5,
    isPriority: false,
    streakGoal: 30,
    remindersPerDay: 1,
    category: "family",
    trackingMode: "step",
    dailyTarget: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-finance",
    name: "Финансы",
    description: "Записать все расходы",
    colorToken: getCategoryColor("finance"),
    order: 6,
    isPriority: false,
    streakGoal: 25,
    remindersPerDay: 1,
    category: "finance",
    trackingMode: "step",
    dailyTarget: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-home",
    name: "Дом",
    description: "20 минут порядка",
    colorToken: getCategoryColor("home"),
    order: 7,
    isPriority: false,
    streakGoal: 15,
    remindersPerDay: 1,
    category: "home",
    trackingMode: "custom",
    dailyTarget: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-exercise",
    name: "Физические упражнения",
    description: "30 минут тренировки",
    colorToken: getCategoryColor("health"),
    order: 8,
    isPriority: true,
    streakGoal: 50,
    remindersPerDay: 1,
    category: "health",
    trackingMode: "step",
    dailyTarget: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-water",
    name: "Вода",
    description: "8 стаканов в день",
    colorToken: getCategoryColor("health"),
    order: 9,
    isPriority: false,
    streakGoal: 20,
    remindersPerDay: 4,
    category: "health",
    trackingMode: "custom",
    dailyTarget: 8,
    createdAt: new Date().toISOString(),
  },
];

export const demoArchivedHabits: Habit[] = [
  {
    id: "demo-old-exercise",
    name: "Утренняя зарядка",
    description: "10 минут упражнений",
    colorToken: getCategoryColor("health"),
    order: 8,
    isPriority: false,
    streakGoal: 21,
    remindersPerDay: 1,
    category: "health",
    trackingMode: "step",
    dailyTarget: 1,
    archived: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(),
  },
  {
    id: "demo-old-water",
    name: "Вода",
    description: "8 стаканов в день",
    colorToken: getCategoryColor("health"),
    order: 9,
    isPriority: true,
    streakGoal: 30,
    remindersPerDay: 4,
    category: "health",
    trackingMode: "custom",
    dailyTarget: 8,
    archived: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
  },
  {
    id: "demo-old-journaling",
    name: "Ведение дневника",
    description: "Запись мыслей перед сном",
    colorToken: getCategoryColor("mindset"),
    order: 10,
    isPriority: false,
    streakGoal: 14,
    remindersPerDay: 1,
    category: "mindset",
    trackingMode: "step",
    dailyTarget: 1,
    archived: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
];

const demoEmotionPool = [
  "спокойствие",
  "энергия",
  "благодарность",
  "любовь",
  "гордость",
  "уверенность",
  "фокус",
  "вдохновение",
  "тревога",
  "грусть",
];

const demoJournalDays = getPastDays(365 * 3).filter((_, index) => index % 9 === 0);

export const demoJournal: JournalEntry[] = demoJournalDays.map((date, index) => {
  const emotions = [
    demoEmotionPool[index % demoEmotionPool.length],
    demoEmotionPool[(index + 3) % demoEmotionPool.length],
  ];
  const tags = ["ритм", "самочувствие", "заметки"][index % 3];
  const dateObj = new Date(date);
  return {
    id: `demo-journal-${index + 1}`,
    date: dateObj.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: dateObj.getTimezoneOffset(),
    type: index % 5 === 0 ? "audio" : "text",
    content: index % 5 === 0 ? "demo-evening-note.mp3" : `День ${index + 1}: фиксирую прогресс и настроение.`,
    encryptedContent: "",
    textContent: index % 5 === 0 ? "Запись дня: заметил важные детали и спокойный темп." : undefined,
    tags: [tags],
    emotions,
  };
});

export const demoStopCrane: StopCraneItem[] = [
  {
    id: "demo-stop-1",
    type: "text",
    content: "Пауза: 5 вдохов и выдохов, замедлись.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-stop-2",
    type: "link",
    content: "https://www.youtube.com/watch?v=uwEaQk5VeS4",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-stop-3",
    type: "image",
    content: "/demo.png",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-stop-4",
    type: "radio",
    content: "https://radio.plaza.one/ogg",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-stop-5",
    type: "stop",
    content: "STOP",
    createdAt: new Date().toISOString(),
  },
];

export const demoLogs: HabitLog[] = (() => {
  const days = getPastDays(365 * 3);
  const logs: HabitLog[] = [];
  const allHabits = [...demoHabits, ...demoArchivedHabits];

  days.forEach((date, index) => {
    const dayFromEnd = days.length - 1 - index;
    allHabits.forEach((habit) => {
      if (habit.archived) {
        const createdAt = new Date(habit.createdAt);
        const currentDate = new Date(date);
        const daysSinceCreation = Math.floor((currentDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const archiveAfterDays = habit.id.includes("exercise") ? 120 : habit.id.includes("water") ? 180 : 120;
        if (daysSinceCreation > archiveAfterDays) return;
      }

      if (habit.id === "demo-walk" && dayFromEnd < 140) {
        logs.push({
          habitId: habit.id,
          date,
          status: "done",
          count: habit.dailyTarget ?? 1,
        });
        return;
      }

      if (habit.id === "demo-focus" && dayFromEnd < 90) {
        const weekday = new Date(date).getDay();
        if (weekday !== 0 && weekday !== 6) {
          logs.push({
            habitId: habit.id,
            date,
            status: "done",
            count: habit.dailyTarget ?? 1,
          });
        }
        return;
      }

      if (habit.id === "demo-meditation" && dayFromEnd < 70) {
        if (dayFromEnd % 2 === 0) {
          logs.push({
            habitId: habit.id,
            date,
            status: "done",
            count: habit.dailyTarget ?? 1,
          });
        }
        return;
      }

      const baseChance = habit.isPriority ? 0.82 : 0.6;
      const wave = 0.2 * Math.sin(index / 14 + habit.order);
      if (Math.random() < baseChance + wave) {
        const count = habit.dailyTarget
          ? Math.min(habit.dailyTarget, Math.max(1, Math.ceil(Math.random() * habit.dailyTarget)))
          : 1;
        logs.push({
          habitId: habit.id,
          date,
          status: count >= (habit.dailyTarget ?? 1) ? "done" : "missed",
          count,
        });
      }
    });
  });
  return logs;
})();
