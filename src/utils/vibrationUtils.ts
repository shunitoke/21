import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export const vibrationPatterns = {
  normal: [30, 40, 30],
  priority: [50, 60, 50, 30, 60],
  achievement: [80, 40, 80, 40, 80],
  light: [20],
  ultraLight: [10],
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

export const triggerVibration = async (pattern: keyof typeof vibrationPatterns | number[]) => {
  const isNative = typeof window !== "undefined" && typeof (window as any).Capacitor !== "undefined";
  
  if (isNative) {
    try {
      // Map patterns to appropriate haptic styles
      const patternKey = typeof pattern === "string" ? pattern : "normal";
      let style = ImpactStyle.Medium;
      
      switch (patternKey) {
        case "ultraLight":
        case "light":
          style = ImpactStyle.Light;
          break;
        case "medium":
        case "normal":
          style = ImpactStyle.Medium;
          break;
        case "achievement":
        case "important":
        case "legendary":
        case "priority":
          style = ImpactStyle.Heavy;
          break;
        case "error":
          await Haptics.notification({ type: NotificationType.Error });
          return;
        default:
          style = ImpactStyle.Medium;
      }
      
      await Haptics.impact({ style });
      
      // Double pulse for stronger patterns
      if (["priority", "achievement", "legendary"].includes(patternKey)) {
        setTimeout(() => Haptics.impact({ style }), 80);
      }
    } catch {
      // Ignore haptics errors
    }
    return;
  }

  // Web fallback
  if (!navigator.vibrate) return;
  if (!hasUserInteracted) return;

  const vibrationPattern = typeof pattern === "string" ? vibrationPatterns[pattern] : pattern;
  try {
    navigator.vibrate(vibrationPattern);
  } catch (e) {
    // Ignore vibration errors
  }
};

export const vibrationFeedback = {
  buttonPress: () => triggerVibration("ultraLight"),
  priorityButtonPress: () => triggerVibration("medium"),
  dragStart: () => triggerVibration("ultraLight"),
  dragEnd: () => triggerVibration("medium"),
  dropSuccess: () => triggerVibration("normal"),
  swipeLeft: () => triggerVibration("ultraLight"),
  swipeRight: () => triggerVibration("ultraLight"),
  modalOpen: () => triggerVibration("ultraLight"),
  modalClose: () => triggerVibration("ultraLight"),
  formSubmit: () => triggerVibration("medium"),
  formError: () => triggerVibration("error"),
  tabSwitch: () => triggerVibration("ultraLight"),
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
