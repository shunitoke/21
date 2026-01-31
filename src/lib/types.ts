export type Locale = "ru" | "en";
export type ThemePreference = "system" | "light" | "dark";
export type AllyTone = "friend" | "coach";
export type Screen = "home" | "progress" | "practice" | "settings";
export type HabitCategoryId =
  | "health"
  | "relationships"
  | "mindset"
  | "work"
  | "creativity"
  | "growth"
  | "learning"
  | "finance"
  | "home"
  | "spiritual"
  | "family";

export interface UserSettings {
  id: string;
  locale: Locale;
  theme: ThemePreference;
  ally: AllyTone;
  demoMode?: boolean;
  tutorialCompleted?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  colorToken: string;
  order: number;
  isPriority: boolean;
  archived?: boolean;
  streakGoal?: number | null;
  remindersPerDay?: number;
  category?: HabitCategoryId | null;
  trackingMode?: "step" | "custom";
  dailyTarget?: number;
  createdAt: string;
}

export type HabitLogStatus = "done" | "missed";

export interface HabitLog {
  date: string;
  habitId: string;
  status: HabitLogStatus;
  count?: number;
  note?: string;
}

export type JournalEntryType = "text" | "audio";

export interface JournalEntry {
  id: string;
  date: string;
  timezone: string; // IANA timezone name, e.g., "Europe/Moscow"
  timezoneOffset: number; // Minutes from UTC, e.g., -180 for UTC+3
  type: JournalEntryType;
  encryptedContent: string;
  content: string;
  textContent?: string;
  emotions: string[];
  tags?: string[];
  audioDuration?: number;
}

export type StopCraneType = "text" | "link" | "image" | "audio" | "radio" | "stop";

export interface StopCraneItem {
  id: string;
  type: StopCraneType;
  content: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  habitId?: string;
  name: string;
  unlocked: boolean;
  dateUnlocked?: string;
}
