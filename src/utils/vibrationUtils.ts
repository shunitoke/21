export const vibrationPatterns = {
  normal: [30, 40, 30],
  priority: [50, 60, 50, 30, 60],
  achievement: [80, 40, 80, 40, 80],
  light: [20],
  medium: [40],
  error: [10, 10, 10],
  important: [100],
  legendary: [100, 50, 100, 50, 100, 50],
  app: [40, 30, 40],
  journal: [50, 40, 50],
  discipline: [60, 50, 60],
} as const;

// Флаг для отслеживания первого взаимодействия пользователя
let hasUserInteracted = typeof window !== "undefined" ? true : false;

// Устанавливаем флаг при первом взаимодействии
if (typeof window !== "undefined") {
  const setInteracted = () => {
    hasUserInteracted = true;
  };
  window.addEventListener("pointerdown", setInteracted);
  window.addEventListener("touchstart", setInteracted);
  window.addEventListener("keydown", setInteracted);
}

export const triggerVibration = (pattern: keyof typeof vibrationPatterns | number[]) => {
  if (!navigator.vibrate) return;
  if (!hasUserInteracted) return; // Браузер блокирует вибрацию без user gesture

  const vibrationPattern = typeof pattern === "string" ? vibrationPatterns[pattern] : pattern;
  try {
    navigator.vibrate(vibrationPattern);
  } catch (e) {
    // Игнорируем ошибки вибрации
  }
};

export const vibrationFeedback = {
  buttonPress: () => triggerVibration("light"),
  priorityButtonPress: () => triggerVibration("medium"),
  dragStart: () => triggerVibration("light"),
  dragEnd: () => triggerVibration("medium"),
  dropSuccess: () => triggerVibration("normal"),
  swipeLeft: () => triggerVibration("light"),
  swipeRight: () => triggerVibration("light"),
  modalOpen: () => triggerVibration("light"),
  modalClose: () => triggerVibration("light"),
  formSubmit: () => triggerVibration("medium"),
  formError: () => triggerVibration("error"),
  tabSwitch: () => triggerVibration("light"),
  habitComplete: () => triggerVibration("normal"),
  priorityHabitComplete: () => triggerVibration("priority"),
  habitUndo: () => triggerVibration("light"),
  achievementUnlock: () => triggerVibration("achievement"),
  legendaryAchievement: () => triggerVibration("legendary"),
  appAchievement: () => triggerVibration("app"),
  journalAchievement: () => triggerVibration("journal"),
  disciplineAchievement: () => triggerVibration("discipline"),
  rareAchievement: () => triggerVibration("achievement"),
  anchorPin: () => triggerVibration("medium"),
  anchorRemove: () => triggerVibration("medium"),
  breathingStart: () => triggerVibration("important"),
  breathingEnd: () => triggerVibration("medium"),
};
