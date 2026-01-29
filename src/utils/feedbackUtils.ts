import type { AllyTone } from "@/lib/types";

const vibrationPattern: Record<"normal" | "priority", number[]> = {
  normal: [30, 40, 30],
  priority: [50, 60, 50, 30, 60],
};

const reinforceCopy: Record<AllyTone, string[]> = {
  friend: [
    "Отлично. Маленький шаг — уже движение.",
    "Готово. Сегодня ты в потоке.",
    "Зачёт. Пусть это будет мягкой победой.",
  ],
  coach: ["Есть. Держим дисциплину.", "Выполнено. Продолжай ритм.", "Чисто. Следующий шаг — твой."],
};

const streakGoalCopy: Record<AllyTone, string[]> = {
  friend: ["Цель серии достигнута.", "Есть. Серия закрыта.", "Серия выполнена."],
  coach: ["Цель серии выполнена.", "Серия закрыта.", "Отработано. Серия взята."],
};

const contextualReinforceCopy: Record<AllyTone, { morning: string[]; night: string[] }> = {
  friend: {
    morning: ["Начал день правильно.", "Утро в зачёте.", "Хорошее утро — хороший ритм."],
    night: ["Даже поздно — ты всё равно сделал.", "День закрыт чисто.", "Поздно, но уверенно."],
  },
  coach: {
    morning: ["Старт дня взят.", "Утренний ритм зафиксирован.", "Утро закрыто."],
    night: ["Дисциплина до конца дня.", "День закрыт без срывов.", "Финиш уверенный."],
  },
};

let lastContextToastAt = 0;
let lastToastAt = 0;

const randomFrom = (items: string[]) => items[Math.floor(Math.random() * items.length)];

export const triggerVibration = (isPriority: boolean, completed: boolean, goalReached: boolean) => {
  if (!navigator.vibrate) return;

  const basePattern = isPriority
    ? completed
      ? [...vibrationPattern.priority, 80, 40, 80]
      : vibrationPattern.priority
    : vibrationPattern.normal;
  const pattern = goalReached ? [...vibrationPattern.priority, 100, 60, 160] : basePattern;
  navigator.vibrate(pattern);
};

export const generateToastMessage = (
  ally: AllyTone,
  completed: boolean,
  goalReached: boolean,
  isPriority: boolean
): { message: string; showToast: boolean } => {
  const now = Date.now();
  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 11;
  const isNight = hour >= 21 || hour < 2;

  const contextEligible = (isMorning || isNight) && now - lastContextToastAt > 6 * 60 * 60 * 1000;
  const shouldUseContext = contextEligible && Math.random() < 0.2;
  const contextPool = contextualReinforceCopy[ally];
  const contextMessage = isMorning ? randomFrom(contextPool.morning) : isNight ? randomFrom(contextPool.night) : undefined;

  const message = goalReached
    ? randomFrom(streakGoalCopy[ally])
    : shouldUseContext && contextMessage
      ? contextMessage
      : randomFrom(reinforceCopy[ally]);

  if (shouldUseContext) {
    lastContextToastAt = now;
  }

  const toastCooldown = isPriority ? 60 * 1000 : 3 * 60 * 1000;
  const toastEligible = goalReached || now - lastToastAt > toastCooldown;
  const toastChance = goalReached ? 1 : isPriority ? 0.6 : 0.3;
  const showToast = completed && toastEligible && Math.random() < toastChance;

  if (showToast) {
    lastToastAt = now;
  }

  return { message, showToast };
};
