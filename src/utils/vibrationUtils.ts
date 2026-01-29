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

export const triggerVibration = (pattern: keyof typeof vibrationPatterns | number[]) => {
  if (!navigator.vibrate) return;

  const vibrationPattern = typeof pattern === "string" ? vibrationPatterns[pattern] : pattern;
  navigator.vibrate(vibrationPattern);
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
