import { create } from "zustand";
import type {
  Achievement,
  Habit,
  HabitLog,
  JournalEntry,
  Screen,
  StopCraneItem,
  UserSettings,
} from "@/lib/types";
import { DEMO_STATE_KEY, loadState, saveState, saveThemePreference } from "@/services/storage";
const STATE_KEY = "app";
import {
  defaultHabits,
  defaultJournal,
  defaultStopCrane,
  demoArchivedHabits,
  demoHabits,
  demoJournal,
  demoLogs,
  demoSettings,
  demoStopCrane,
} from "@/data/seed";
import { getTodayISO } from "@/lib/date";
import { calculateHabitLogUpdate, calculateStreakProgress } from "@/utils/habitUtils";
import { generateToastMessage, triggerVibration } from "@/utils/feedbackUtils";
import { detectSystemLocale } from "@/utils/locale";
import { getCategoryColor } from "@/lib/categories";

const getDefaultSettings = () => ({
  id: "settings",
  locale: detectSystemLocale(),
  theme: "system" as const,
  ally: "friend" as const,
  demoMode: false,
  tutorialCompleted: false,
});

const persistState = (
  state: {
    settings: UserSettings;
    habits: Habit[];
    logs: HabitLog[];
    journal: JournalEntry[];
    stopCrane: StopCraneItem[];
  },
  demoMode?: boolean
) => saveState(state, demoMode ? DEMO_STATE_KEY : undefined);

let persistTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingPersist: {
  state: {
    settings: UserSettings;
    habits: Habit[];
    logs: HabitLog[];
    journal: JournalEntry[];
    stopCrane: StopCraneItem[];
  };
  demoMode?: boolean;
} | null = null;

const reorderHabitsWithPriority = (habits: Habit[]) => {
  const byOrder = [...habits].sort((a, b) => a.order - b.order);
  const priority = byOrder.filter((h) => h.isPriority);
  const normal = byOrder.filter((h) => !h.isPriority);
  return [...priority, ...normal].map((h, order) => ({ ...h, order }));
};

const schedulePersistState = (
  state: {
    settings: UserSettings;
    habits: Habit[];
    logs: HabitLog[];
    journal: JournalEntry[];
    stopCrane: StopCraneItem[];
  },
  demoMode?: boolean
) => {
  pendingPersist = { state, demoMode };
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    const next = pendingPersist;
    pendingPersist = null;
    persistTimeout = null;
    if (!next) return;
    void persistState(next.state, next.demoMode);
  }, 250);
};

const persistThemePreference = (theme: UserSettings["theme"]) => {
  void saveThemePreference(theme);
};

const computeAchievements = (habits: Habit[], logs: HabitLog[], journal: JournalEntry[] = []): Achievement[] => {
  const priorityHabits = habits.filter((habit) => habit.isPriority);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 21);

  const doneDatesByHabit = new Map<string, string[]>();
  const doneCountByHabit = new Map<string, number>();
  const recentByHabit = new Map<string, HabitLog[]>();
  const recentDoneCountByHabit = new Map<string, number>();

  logs.forEach((log) => {
    if (log.status === "done") {
      const dates = doneDatesByHabit.get(log.habitId) ?? [];
      dates.push(log.date);
      doneDatesByHabit.set(log.habitId, dates);
      doneCountByHabit.set(log.habitId, (doneCountByHabit.get(log.habitId) ?? 0) + 1);
    }

    if (new Date(log.date) >= cutoff) {
      const recent = recentByHabit.get(log.habitId) ?? [];
      recent.push(log);
      recentByHabit.set(log.habitId, recent);
      if (log.status === "done") {
        recentDoneCountByHabit.set(log.habitId, (recentDoneCountByHabit.get(log.habitId) ?? 0) + 1);
      }
    }
  });

  const doneLogs = logs.filter((log) => log.status === "done");

  const getMaxStreak = (dates: string[]) => {
    if (!dates.length) return 0;
    const sorted = Array.from(new Set(dates)).sort();
    let max = 1;
    let current = 1;
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(sorted[i - 1]);
      const next = new Date(sorted[i]);
      const diff = (next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current += 1;
      } else {
        max = Math.max(max, current);
        current = 1;
      }
    }
    return Math.max(max, current);
  };

  const habitAchievements = priorityHabits
    .map((habit) => {
      const relevantLogs = recentByHabit.get(habit.id) ?? [];
      const maxStreak = getMaxStreak(relevantLogs.map((log) => log.date));
      const totalDone = doneCountByHabit.get(habit.id) ?? 0;

      return [
        {
          id: `achievement-${habit.id}-rare-streak-21`,
          habitId: habit.id,
          name: `${habit.name}: 21 день`,
          unlocked: maxStreak >= 21,
          dateUnlocked: maxStreak >= 21 ? new Date().toISOString() : undefined,
        },
        {
          id: `achievement-${habit.id}-rare-streak-30`,
          habitId: habit.id,
          name: `${habit.name}: 30 дней`,
          unlocked: maxStreak >= 30,
          dateUnlocked: maxStreak >= 30 ? new Date().toISOString() : undefined,
        },
        {
          id: `achievement-${habit.id}-rare-touch-100`,
          habitId: habit.id,
          name: `${habit.name}: 100 касаний`,
          unlocked: totalDone >= 100,
          dateUnlocked: totalDone >= 100 ? new Date().toISOString() : undefined,
        },
        {
          id: `achievement-${habit.id}-legendary-streak-60`,
          habitId: habit.id,
          name: `${habit.name}: 60 дней`,
          unlocked: maxStreak >= 60,
          dateUnlocked: maxStreak >= 60 ? new Date().toISOString() : undefined,
        },
        {
          id: `achievement-${habit.id}-legendary-touch-200`,
          habitId: habit.id,
          name: `${habit.name}: 200 касаний`,
          unlocked: totalDone >= 200,
          dateUnlocked: totalDone >= 200 ? new Date().toISOString() : undefined,
        },
      ];
    })
    .flat();

  const regularHabitAchievements = habits
    .filter((habit) => !habit.isPriority && !habit.archived)
    .map((habit) => {
      const relevantLogs = recentByHabit.get(habit.id) ?? [];
      const maxStreak = getMaxStreak(relevantLogs.map((log) => log.date));
      const totalDone = doneCountByHabit.get(habit.id) ?? 0;

      return [
        {
          id: `achievement-${habit.id}-rare-streak-21`,
          habitId: habit.id,
          name: `${habit.name}: 21 день`,
          unlocked: maxStreak >= 21,
          dateUnlocked: maxStreak >= 21 ? new Date().toISOString() : undefined,
        },
        {
          id: `achievement-${habit.id}-rare-streak-30`,
          habitId: habit.id,
          name: `${habit.name}: 30 дней`,
          unlocked: maxStreak >= 30,
          dateUnlocked: maxStreak >= 30 ? new Date().toISOString() : undefined,
        },
        {
          id: `achievement-${habit.id}-rare-touch-50`,
          habitId: habit.id,
          name: `${habit.name}: 50 касаний`,
          unlocked: totalDone >= 50,
          dateUnlocked: totalDone >= 50 ? new Date().toISOString() : undefined,
        },
      ];
    })
    .flat();

  const globalAchievements: Achievement[] = [
    {
      id: "achievement-first-habit",
      name: "Первая привычка",
      unlocked: habits.length >= 1,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-five-habits",
      name: "Пять привычек",
      unlocked: habits.length >= 5,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-all-categories",
      name: "Все категории",
      unlocked: new Set(habits.map((habit) => habit.category)).size >= 5,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-priority-five",
      name: "Пять приоритетов",
      unlocked: priorityHabits.length >= 5,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-first-entry",
      name: "Первая запись",
      unlocked: journal.length >= 1,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-week-journal",
      name: "Неделя записей",
      unlocked: journal.length >= 7,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-month-journal",
      name: "Месяц записей",
      unlocked: journal.length >= 30,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-audio-master",
      name: "Аудио мастер",
      unlocked: journal.filter((entry) => entry.type === "audio").length >= 10,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-first-steps",
      name: "Первые шаги",
      unlocked: doneLogs.length >= 1,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-consistent",
      name: "Постоянство",
      unlocked: doneLogs.length >= 30,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-hundred",
      name: "100 касаний",
      unlocked: doneLogs.length >= 100,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-dedicated",
      name: "Преданность",
      unlocked: doneLogs.length >= 200,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-master",
      name: "Мастер",
      unlocked: doneLogs.length >= 500,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-365",
      name: "365 касаний",
      unlocked: doneLogs.length >= 365,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-iron-streak",
      name: "Железный ритм",
      unlocked: priorityHabits.some((habit) => getMaxStreak(doneDatesByHabit.get(habit.id) ?? []) >= 21),
      dateUnlocked: undefined,
    },
    {
      id: "achievement-core-trio",
      name: "Три привычки — ядро",
      unlocked:
        priorityHabits.filter((habit) => {
          const recent = recentByHabit.get(habit.id) ?? [];
          const done = recentDoneCountByHabit.get(habit.id) ?? 0;
          const rate = recent.length === 0 ? 0 : done / recent.length;
          return rate >= 0.9 && recent.length >= 18;
        }).length >= 3,
      dateUnlocked: undefined,
    },
    {
      id: "achievement-unstoppable-week",
      name: "Неделя без пропуска",
      unlocked:
        priorityHabits.length > 0 &&
        priorityHabits.every((habit) => {
          const recent = (recentByHabit.get(habit.id) ?? []).filter((log) => log.status === "done");
          return getMaxStreak(recent.map((log) => log.date)) >= 7;
        }),
      dateUnlocked: undefined,
    },
    {
      id: "achievement-month-ritual",
      name: "Месяц без срывов",
      unlocked: priorityHabits.some((habit) => getMaxStreak(doneDatesByHabit.get(habit.id) ?? []) >= 30),
      dateUnlocked: undefined,
    },
  ];

  return [...habitAchievements, ...regularHabitAchievements, ...globalAchievements].map((achievement) =>
    achievement.unlocked
      ? { ...achievement, dateUnlocked: achievement.dateUnlocked ?? new Date().toISOString() }
      : achievement
  );
};

interface AppState {
  screen: Screen;
  settings: UserSettings;
  habits: Habit[];
  logs: HabitLog[];
  journal: JournalEntry[];
  stopCrane: StopCraneItem[];
  achievements: Achievement[];
  toast?: string;
  loading: boolean;
  init: () => Promise<void>;
  setScreen: (screen: Screen) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (habit: Habit) => void;
  archiveHabit: (habitId: string) => void;
  restoreHabit: (habitId: string) => void;
  removeHabit: (habitId: string) => void;
  moveHabit: (habitId: string, targetId: string) => void;
  reorderHabits: (orderedIds: string[]) => void;
  toggleHabitToday: (habitId: string, isPriority: boolean, dailyTarget?: number) => void;
  toggleHabitDate: (habitId: string, date: string, dailyTarget?: number) => void;
  setHabitDate: (habitId: string, date: string, count: number) => void;
  addJournalEntry: (entry: JournalEntry) => void;
  updateJournalEntry: (entry: JournalEntry) => void;
  removeJournalEntry: (id: string) => void;
  addStopCrane: (item: StopCraneItem) => void;
  removeStopCrane: (id: string) => void;
  replaceStopCrane: (items: StopCraneItem[]) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  toggleDemoMode: (enabled: boolean) => void;
  clearToast: () => void;
  importData: (data: { settings: UserSettings; habits: Habit[]; logs: HabitLog[]; journal: JournalEntry[]; stopCrane: StopCraneItem[] }) => void;
  completeTutorial: () => void;
}

type SetState = (partial: Partial<AppState>) => void;
type GetState = () => AppState;

export const useAppStore = create<AppState>((set: SetState, get: GetState) => ({
  screen: "home",
  settings: getDefaultSettings(),
  habits: defaultHabits,
  logs: [],
  journal: defaultJournal,
  stopCrane: defaultStopCrane,
  achievements: [],
  toast: undefined,
  loading: true,
  init: async () => {
    const persisted = await loadState();
    if (!persisted) {
      const settings = getDefaultSettings();
      set({
        settings,
        habits: defaultHabits,
        logs: [],
        journal: defaultJournal,
        stopCrane: defaultStopCrane,
        achievements: computeAchievements(defaultHabits, [], defaultJournal),
        loading: false,
      });
      await persistState(
        {
          settings,
          habits: defaultHabits,
          logs: [],
          journal: defaultJournal,
          stopCrane: defaultStopCrane,
        },
        false
      );
      return;
    }

    if (persisted.settings.demoMode) {
      // Load notification settings from main storage, everything else from demo
      const mainState = await loadState(STATE_KEY);
      const notificationSettings = mainState?.settings?.notificationSettings ?? persisted.settings.notificationSettings;
      const tutorialCompleted = persisted.settings.tutorialCompleted;
      set({
        settings: { ...demoSettings, notificationSettings, tutorialCompleted, demoMode: true },
        habits: [...demoHabits, ...demoArchivedHabits],
        logs: demoLogs,
        journal: demoJournal,
        stopCrane: demoStopCrane,
        achievements: computeAchievements([...demoHabits, ...demoArchivedHabits], demoLogs, demoJournal),
        loading: false,
      });
      await persistState(
        {
          settings: { ...demoSettings, notificationSettings, tutorialCompleted, demoMode: true },
          habits: [...demoHabits, ...demoArchivedHabits],
          logs: demoLogs,
          journal: demoJournal,
          stopCrane: demoStopCrane,
        },
        true
      );
      return;
    }

    const migratedHabits = persisted.habits.map((habit) => ({
      ...habit,
      colorToken: getCategoryColor(habit.category),
    }));
    set({
      settings: persisted.settings,
      habits: migratedHabits,
      logs: persisted.logs,
      journal: persisted.journal,
      stopCrane: persisted.stopCrane,
      achievements: computeAchievements(migratedHabits, persisted.logs, persisted.journal),
      loading: false,
    });
    persistThemePreference(persisted.settings.theme);
    await persistState(
      {
        settings: persisted.settings,
        habits: migratedHabits,
        logs: persisted.logs,
        journal: persisted.journal,
        stopCrane: persisted.stopCrane,
      },
      false
    );
  },
  setScreen: (screen: Screen) => set({ screen }),
  toggleDemoMode: (enabled: boolean) => {
    if (enabled) {
      const currentTheme = get().settings.theme;
      const currentLocale = get().settings.locale;
      const currentAlly = get().settings.ally;
      const currentNotifications = get().settings.notificationSettings;
      const tutorialCompleted = get().settings.tutorialCompleted;
      persistThemePreference(currentTheme);
      const mainSnapshot = {
        settings: { ...get().settings, demoMode: true },
        habits: get().habits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      };
      set({
        screen: "home",
        settings: { ...demoSettings, theme: currentTheme, locale: currentLocale, ally: currentAlly, notificationSettings: currentNotifications, demoMode: true, tutorialCompleted },
        habits: [...demoHabits, ...demoArchivedHabits],
        logs: demoLogs,
        journal: demoJournal,
        stopCrane: demoStopCrane,
        achievements: computeAchievements([...demoHabits, ...demoArchivedHabits], demoLogs, demoJournal),
        loading: false,
      });
      persistThemePreference(currentTheme);
      void (async () => {
        await persistState(mainSnapshot, false);
        await persistState(
          {
            settings: { ...demoSettings, theme: currentTheme, locale: currentLocale, ally: currentAlly, notificationSettings: currentNotifications, demoMode: true, tutorialCompleted },
            habits: [...demoHabits, ...demoArchivedHabits],
            logs: demoLogs,
            journal: demoJournal,
            stopCrane: demoStopCrane,
          },
          true
        );
      })();
      return;
    }
    void (async () => {
      const currentTheme = get().settings.theme;
      const currentLocale = get().settings.locale;
      const mainData = await loadState();
      if (mainData) {
        const nextSettings = { ...mainData.settings, demoMode: false, theme: currentTheme, locale: currentLocale };
        set({
          screen: "home",
          settings: nextSettings,
          habits: mainData.habits,
          logs: mainData.logs,
          journal: mainData.journal,
          stopCrane: mainData.stopCrane,
          achievements: computeAchievements(mainData.habits, mainData.logs, mainData.journal),
          loading: false,
        });
        persistThemePreference(nextSettings.theme);
        await persistState(
          {
            settings: nextSettings,
            habits: mainData.habits,
            logs: mainData.logs,
            journal: mainData.journal,
            stopCrane: mainData.stopCrane,
          },
          false
        );
        return;
      }
      const settings = getDefaultSettings();
      set({
        screen: "home",
        settings: { ...settings, theme: currentTheme, locale: currentLocale, demoMode: false },
        habits: defaultHabits,
        logs: [],
        journal: defaultJournal,
        stopCrane: defaultStopCrane,
        achievements: computeAchievements(defaultHabits, [], defaultJournal),
        loading: false,
      });
      persistThemePreference(currentTheme);
      await persistState(
        {
          settings: { ...settings, theme: currentTheme, locale: currentLocale, demoMode: false },
          habits: defaultHabits,
          logs: [],
          journal: defaultJournal,
          stopCrane: defaultStopCrane,
        },
        false
      );
    })();
  },
  updateSettings: (settings: Partial<UserSettings>) => {
    const previousDemoMode = get().settings.demoMode;
    const nextSettings = { ...get().settings, ...settings };
    set({ settings: nextSettings });
    if (settings.demoMode !== undefined && settings.demoMode !== previousDemoMode) {
      get().toggleDemoMode(Boolean(settings.demoMode));
      return;
    }
    persistThemePreference(nextSettings.theme);
    void persistState(
      {
        settings: nextSettings,
        habits: get().habits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      nextSettings.demoMode
    );
  },
  addHabit: (habit: Habit) => {
    const existing = [...get().habits];
    const sortedExisting = reorderHabitsWithPriority(existing);
    const priorityCount = sortedExisting.filter((h) => h.isPriority).length;
    const insertAt = habit.isPriority ? 0 : priorityCount;
    const merged = [...sortedExisting];
    merged.splice(insertAt, 0, habit);
    const nextHabits = reorderHabitsWithPriority(merged);
    set({ habits: nextHabits, achievements: computeAchievements(nextHabits, get().logs, get().journal) });
    void persistState(
      {
        settings: get().settings,
        habits: nextHabits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  reorderHabits: (orderedIds: string[]) => {
    const existing = get().habits;
    const byId = new Map(existing.map((habit) => [habit.id, habit] as const));
    const orderedSet = new Set(orderedIds);
    const orderedHabits: Habit[] = [];

    orderedIds.forEach((id, order) => {
      const habit = byId.get(id);
      if (!habit) return;
      orderedHabits.push({ ...habit, order });
    });

    const remaining = existing
      .filter((habit) => !orderedSet.has(habit.id))
      .sort((a, b) => a.order - b.order)
      .map((habit, index) => ({ ...habit, order: orderedHabits.length + index }));

    const nextHabits = reorderHabitsWithPriority([...orderedHabits, ...remaining]);
    set({ habits: nextHabits });
    void persistState(
      {
        settings: get().settings,
        habits: nextHabits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  moveHabit: (habitId: string, targetId: string) => {
    if (habitId === targetId) return;
    const habits = [...get().habits].sort((a, b) => a.order - b.order);
    const fromIndex = habits.findIndex((habit) => habit.id === habitId);
    const toIndex = habits.findIndex((habit) => habit.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = habits.splice(fromIndex, 1);
    habits.splice(toIndex, 0, moved);
    const nextHabits = reorderHabitsWithPriority(habits);
    set({ habits: nextHabits });
    void persistState(
      {
        settings: get().settings,
        habits: nextHabits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  updateHabit: (habit: Habit) => {
    const nextHabits = reorderHabitsWithPriority(get().habits.map((item) => (item.id === habit.id ? habit : item)));
    set({ habits: nextHabits, achievements: computeAchievements(nextHabits, get().logs, get().journal) });
    void persistState(
      {
        settings: get().settings,
        habits: nextHabits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  archiveHabit: (habitId: string) => {
    const nextHabits = get().habits.map((habit) => (habit.id === habitId ? { ...habit, archived: true } : habit));
    set({ habits: nextHabits });
    void persistState(
      {
        settings: get().settings,
        habits: nextHabits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  restoreHabit: (habitId: string) => {
    const nextHabits = get().habits.map((habit) => (habit.id === habitId ? { ...habit, archived: false } : habit));
    set({ habits: nextHabits });
    void persistState(
      {
        settings: get().settings,
        habits: nextHabits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  removeHabit: (habitId: string) => {
    const nextHabits = get().habits.filter((item) => item.id !== habitId);
    const nextLogs = get().logs.filter((log) => log.habitId !== habitId);
    set({ habits: nextHabits, logs: nextLogs, achievements: computeAchievements(nextHabits, nextLogs, get().journal) });
    void persistState(
      {
        settings: get().settings,
        habits: nextHabits,
        logs: nextLogs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  toggleHabitToday: (habitId: string, isPriority: boolean, dailyTarget = 1) => {
    const today = getTodayISO();
    const habit = get().habits.find((item) => item.id === habitId);
    const currentLogs = get().logs;

    const { nextLogs, completed } = calculateHabitLogUpdate(currentLogs, habitId, dailyTarget);
    const streakGoal = habit?.streakGoal ?? null;
    const { goalReached } = calculateStreakProgress(nextLogs, habitId, streakGoal, today);

    triggerVibration(isPriority, completed, goalReached);
    const { message, showToast } = generateToastMessage(get().settings.ally, completed, goalReached, isPriority);

    set({
      logs: nextLogs,
      achievements: computeAchievements(get().habits, nextLogs, get().journal),
      toast: showToast ? message : undefined,
    });

    schedulePersistState(
      {
        settings: get().settings,
        habits: get().habits,
        logs: nextLogs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  toggleHabitDate: (habitId: string, date: string, dailyTarget = 1) => {
    const existing = get().logs.find((log) => log.habitId === habitId && log.date === date);
    const currentCount = existing?.count ?? 1;
    const target = Math.max(1, dailyTarget);
    let nextLogs: HabitLog[];
    if (existing) {
      if (currentCount >= target) {
        nextLogs = get().logs.filter((log) => log !== existing);
      } else {
        const nextCount = Math.min(target, currentCount + 1);
        nextLogs = get().logs.map((log) =>
          log === existing
            ? { ...log, count: nextCount, status: nextCount >= target ? "done" : "missed" }
            : log
        );
      }
    } else {
      nextLogs = [...get().logs, { habitId, date, status: target === 1 ? "done" : "missed", count: 1 }];
    }
    set({ logs: nextLogs, achievements: computeAchievements(get().habits, nextLogs, get().journal) });
    schedulePersistState(
      {
        settings: get().settings,
        habits: get().habits,
        logs: nextLogs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  addJournalEntry: (entry: JournalEntry) => {
    const nextJournal = [entry, ...get().journal];
    set({ journal: nextJournal });
    schedulePersistState(
      {
        settings: get().settings,
        habits: get().habits,
        logs: get().logs,
        journal: nextJournal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  updateJournalEntry: (entry: JournalEntry) => {
    const nextJournal = get().journal.map((item) => (item.id === entry.id ? entry : item));
    set({ journal: nextJournal });
    schedulePersistState(
      {
        settings: get().settings,
        habits: get().habits,
        logs: get().logs,
        journal: nextJournal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  removeJournalEntry: (id: string) => {
    const nextJournal = get().journal.filter((item) => item.id !== id);
    set({ journal: nextJournal });
    schedulePersistState(
      {
        settings: get().settings,
        habits: get().habits,
        logs: get().logs,
        journal: nextJournal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  addStopCrane: (item: StopCraneItem) => {
    const nextStopCrane = [item, ...get().stopCrane];
    set({ stopCrane: nextStopCrane });
    schedulePersistState(
      {
        settings: get().settings,
        habits: get().habits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: nextStopCrane,
      },
      get().settings.demoMode
    );
  },
  removeStopCrane: (id: string) => {
    const nextStopCrane = get().stopCrane.filter((item) => item.id !== id);
    set({ stopCrane: nextStopCrane });
    schedulePersistState(
      {
        settings: get().settings,
        habits: get().habits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: nextStopCrane,
      },
      get().settings.demoMode
    );
  },
  replaceStopCrane: (items: StopCraneItem[]) => {
    set({ stopCrane: items });
    schedulePersistState(
      {
        settings: get().settings,
        habits: get().habits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: items,
      },
      get().settings.demoMode
    );
  },
  clearToast: () => set({ toast: undefined }),
  setHabitDate: (habitId: string, date: string, count: number) => {
    const existing = get().logs.find((log) => log.habitId === habitId && log.date === date);
    const habit = get().habits.find((item) => item.id === habitId);
    const target = Math.max(1, habit?.dailyTarget ?? 1);

    let nextLogs: HabitLog[];
    if (count === 0) {
      nextLogs = get().logs.filter((log) => !(log.habitId === habitId && log.date === date));
    } else if (existing) {
      nextLogs = get().logs.map((log) =>
        log.habitId === habitId && log.date === date
          ? { ...log, count: Math.min(target, Math.max(0, count)), status: count >= target ? "done" : "missed" }
          : log
      );
    } else {
      nextLogs = [
        ...get().logs,
        { habitId, date, status: count >= target ? "done" : "missed", count: Math.min(target, Math.max(0, count)) },
      ];
    }

    set({ logs: nextLogs, achievements: computeAchievements(get().habits, nextLogs, get().journal) });

    schedulePersistState(
      {
        settings: get().settings,
        habits: get().habits,
        logs: nextLogs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      get().settings.demoMode
    );
  },
  importData: (data: { settings: UserSettings; habits: Habit[]; logs: HabitLog[]; journal: JournalEntry[]; stopCrane: StopCraneItem[] }) => {
    const { settings, habits, logs, journal, stopCrane } = data;
    // Preserve current theme, locale, ally - only import other settings
    const currentTheme = get().settings.theme;
    const currentLocale = get().settings.locale;
    const currentAlly = get().settings.ally;
    const filteredSettings = { ...settings, theme: currentTheme, locale: currentLocale, ally: currentAlly };
    set({
      settings: { ...get().settings, ...filteredSettings },
      habits,
      logs,
      journal,
      stopCrane,
      achievements: computeAchievements(habits, logs, journal),
    });
    void persistState(
      {
        settings: { ...get().settings, ...filteredSettings },
        habits,
        logs,
        journal,
        stopCrane,
      },
      settings.demoMode
    );
  },
  completeTutorial: () => {
    const nextSettings = { ...get().settings, tutorialCompleted: true };
    set({ settings: nextSettings });
    // Always save tutorial state to main storage, not demo
    void persistState(
      {
        settings: nextSettings,
        habits: get().habits,
        logs: get().logs,
        journal: get().journal,
        stopCrane: get().stopCrane,
      },
      false // Always save to main state, not demo
    );
  },
}));
