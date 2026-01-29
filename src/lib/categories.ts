import {
  Heart,
  Users,
  Brain,
  Briefcase,
  Sparkles,
  Rocket,
  BookOpen,
  PieChart,
  Home,
  Star,
  UsersRound,
  CircleDashed,
} from "lucide-react";
import type { HabitCategoryId, Locale } from "./types";

const uncategorizedMeta: {
  color: string;
  label: Record<Locale, string>;
  icon: typeof Heart;
} = {
  color: "hsl(var(--muted-foreground))",
  label: { ru: "Без категории", en: "Uncategorized" },
  icon: CircleDashed,
};

export const habitCategories: Array<{
  id: HabitCategoryId;
  color: string;
  label: Record<Locale, string>;
  icon: typeof Heart;
}> = [
  { id: "health", color: "hsl(var(--chart-1))", label: { ru: "Здоровье", en: "Health" }, icon: Heart },
  { id: "relationships", color: "hsl(var(--chart-2))", label: { ru: "Отношения", en: "Relationships" }, icon: Users },
  { id: "mindset", color: "hsl(var(--chart-3))", label: { ru: "Мышление", en: "Mindset" }, icon: Brain },
  { id: "work", color: "hsl(var(--chart-4))", label: { ru: "Работа", en: "Work" }, icon: Briefcase },
  { id: "creativity", color: "hsl(var(--chart-5))", label: { ru: "Творчество", en: "Creativity" }, icon: Sparkles },
  { id: "growth", color: "hsl(var(--chart-6))", label: { ru: "Развитие", en: "Growth" }, icon: Rocket },
  { id: "learning", color: "hsl(var(--chart-7))", label: { ru: "Обучение", en: "Learning" }, icon: BookOpen },
  { id: "finance", color: "hsl(var(--chart-8))", label: { ru: "Финансы", en: "Finance" }, icon: PieChart },
  { id: "home", color: "hsl(var(--chart-9))", label: { ru: "Дом", en: "Home" }, icon: Home },
  { id: "spiritual", color: "hsl(var(--chart-10))", label: { ru: "Духовное", en: "Spiritual" }, icon: Star },
  { id: "family", color: "hsl(var(--chart-11))", label: { ru: "Семья", en: "Family" }, icon: UsersRound },
];

export const getCategoryColor = (category?: HabitCategoryId | null) =>
  category
    ? habitCategories.find((item) => item.id === category)?.color ?? habitCategories[0]?.color ?? "hsl(var(--chart-1))"
    : uncategorizedMeta.color;

export const getCategoryMeta = (category?: HabitCategoryId | null) =>
  category ? habitCategories.find((item) => item.id === category) ?? habitCategories[0] : uncategorizedMeta;

export const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
