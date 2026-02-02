import { LocalNotifications, type ScheduleOptions } from "@capacitor/local-notifications";
import type { NotificationFrequency, NotificationSettings, AllyTone, Habit, HabitLog } from "@/lib/types";
import { generateNotificationMessage } from "@/utils/notificationMessages";

const FREQUENCY_COUNTS: Record<NotificationFrequency, number> = {
  rare: 2,
  normal: 4,
  persistent: 6,
};

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  } catch {
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === "granted";
  } catch {
    return false;
  }
}

function generateRandomTimes(count: number, startHour: number, endHour: number): Date[] {
  const times: Date[] = [];
  const now = new Date();
  
  // Guard rails: ensure valid time window
  const validStart = Math.max(0, Math.min(22, startHour));
  const validEnd = Math.max(validStart + 1, Math.min(23, endHour));
  
  const startMinutes = validStart * 60;
  const endMinutes = validEnd * 60;
  const totalWindow = endMinutes - startMinutes;
  
  // Minimum 30 minutes between notifications
  const minInterval = 30;
  const maxCount = Math.floor(totalWindow / minInterval);
  const actualCount = Math.min(count, maxCount);
  
  if (totalWindow <= 0 || actualCount <= 0) {
    return [];
  }

  const usedMinutes = new Set<number>();
  
  for (let i = 0; i < actualCount; i++) {
    let randomMinutes: number;
    let attempts = 0;
    
    do {
      randomMinutes = Math.floor(Math.random() * totalWindow) + startMinutes;
      attempts++;
    } while (usedMinutes.has(randomMinutes) && attempts < 100);
    
    usedMinutes.add(randomMinutes);
    
    const time = new Date(now);
    time.setHours(Math.floor(randomMinutes / 60), randomMinutes % 60, 0, 0);

    // If time already passed today, schedule for tomorrow
    if (time <= now) {
      time.setDate(time.getDate() + 1);
    }

    times.push(time);
  }

  return times.sort((a, b) => a.getTime() - b.getTime());
}

export async function scheduleNotifications(
  settings: NotificationSettings,
  ally: AllyTone,
  habits: Habit[],
  logs: HabitLog[]
): Promise<void> {
  if (!settings.enabled) {
    await cancelAllNotifications();
    return;
  }

  // Guard rails: validate time window
  const validStart = Math.max(0, Math.min(22, settings.startHour));
  const validEnd = Math.max(validStart + 1, Math.min(23, settings.endHour));
  
  if (validEnd <= validStart) {
    console.warn("Invalid notification time window, skipping scheduling");
    return;
  }

  // Cancel existing notifications before scheduling new ones
  await cancelAllNotifications();

  const count = FREQUENCY_COUNTS[settings.frequency];
  const times = generateRandomTimes(count, validStart, validEnd);
  
  if (times.length === 0) {
    console.warn("No valid times generated for notifications");
    return;
  }

  const notifications = times.map((time, index) => {
    const { title, body } = generateNotificationMessage(ally, habits, logs);

    return {
      title,
      body,
      id: index + 1,
      schedule: { at: time },
      sound: "default",
      smallIcon: "ic_notification",
      iconColor: "#007AFF",
    };
  });

  try {
    await LocalNotifications.schedule({
      notifications,
    });
  } catch (error) {
    console.error("Failed to schedule notifications:", error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
    }
  } catch (error) {
    console.error("Failed to cancel notifications:", error);
  }
}

export async function rescheduleForTomorrow(
  settings: NotificationSettings,
  ally: AllyTone,
  habits: Habit[],
  logs: HabitLog[]
): Promise<void> {
  if (!settings.enabled) return;
  
  // Guard rails: validate time window
  const validStart = Math.max(0, Math.min(22, settings.startHour));
  const validEnd = Math.max(validStart + 1, Math.min(23, settings.endHour));
  
  if (validEnd <= validStart) {
    console.warn("Invalid notification time window for reschedule");
    return;
  }

  // Clear all and schedule new ones for tomorrow
  await cancelAllNotifications();
  await scheduleNotifications(settings, ally, habits, logs);
}
