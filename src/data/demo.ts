import type { Habit, HabitLog, JournalEntry, StopCraneItem } from "@/lib/types";
import { getCategoryColor } from "@/lib/categories";
import { getTodayISO } from "@/lib/date";

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
    id: "demo-creativity",
    name: "Идеи",
    description: "5 заметок в день",
    colorToken: getCategoryColor("creativity"),
    order: 3,
    isPriority: false,
    streakGoal: 25,
    remindersPerDay: 1,
    category: "creativity",
    trackingMode: "custom",
    dailyTarget: 5,
    createdAt: new Date().toISOString(),
  },
];

export const demoLogs: HabitLog[] = [
  {
    habitId: "demo-walk",
    date: getTodayISO(),
    status: "done",
    count: 1,
  },
];

export const demoJournal: JournalEntry[] = [
  {
    id: "journal-1",
    date: new Date().toISOString(),
    type: "text",
    encryptedContent: "",
    content: "Сегодня держал темп и сделал все 3 блока фокуса.",
    emotions: ["уверенность", "фокус"],
  },
];

export const demoStopCrane: StopCraneItem[] = [
  {
    id: "anchor-1",
    type: "text",
    content: "Тихий 5-минутный перерыв с дыханием.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "anchor-2",
    type: "link",
    content: "https://music.youtube.com/watch?v=5qap5aO4i9A",
    createdAt: new Date().toISOString(),
  },
  {
    id: "anchor-3",
    type: "radio",
    content: "https://radio.plaza.one/ogg",
    createdAt: new Date().toISOString(),
  },
];
