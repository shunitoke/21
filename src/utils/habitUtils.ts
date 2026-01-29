import type { HabitLog } from "@/lib/types";
import { getTodayISO } from "@/lib/date";

export const calculateHabitLogUpdate = (
  logs: HabitLog[],
  habitId: string,
  dailyTarget: number
): { nextLogs: HabitLog[]; completed: boolean; count: number } => {
  const today = getTodayISO();
  const existing = logs.find((log) => log.habitId === habitId && log.date === today);
  const currentCount = existing?.count ?? 1;
  const target = Math.max(1, dailyTarget);

  let nextLogs: HabitLog[];
  if (existing) {
    if (currentCount >= target) {
      nextLogs = logs.filter((log) => log !== existing);
    } else {
      const nextCount = Math.min(target, currentCount + 1);
      nextLogs = logs.map((log) =>
        log === existing
          ? {
              ...log,
              count: nextCount,
              status: nextCount >= target ? "done" : "missed",
            }
          : log
      );
    }
  } else {
    nextLogs = [...logs, { habitId, date: today, status: target === 1 ? "done" : "missed", count: 1 }];
  }

  const updatedEntry = nextLogs.find((log) => log.habitId === habitId && log.date === today);
  const updatedCount = updatedEntry ? updatedEntry.count ?? 1 : 0;
  const completed = updatedCount >= target;

  return { nextLogs, completed, count: updatedCount };
};

export const calculateStreakProgress = (
  logs: HabitLog[],
  habitId: string,
  streakGoal: number | null,
  today: string
): { prevStreak: number; nextStreak: number; goalReached: boolean } => {
  if (!streakGoal) return { prevStreak: 0, nextStreak: 0, goalReached: false };

  const getCurrentStreak = (dates: string[]) => {
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

  const prevDoneDates = logs.filter((log) => log.habitId === habitId && log.status === "done").map((log) => log.date);
  const nextDoneDates = logs.filter((log) => log.habitId === habitId && log.status === "done").map((log) => log.date);

  const prevStreak = getCurrentStreak(prevDoneDates);
  const nextStreak = getCurrentStreak(nextDoneDates);
  const goalReached = nextStreak >= streakGoal && prevStreak < streakGoal;

  return { prevStreak, nextStreak, goalReached };
};
