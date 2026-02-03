import type { Locale } from "@/lib/types";

type Dictionary = Record<string, { ru: string; en: string }>;

export const dictionary: Dictionary = {
  appTitle: {
    ru: "Программа 21",
    en: "Program 21",
  },
  appSubtitle: {
    ru: "Приватный тренажёр привычек и пространство разгрузки.",
    en: "Private habit trainer and practice space.",
  },
  habits: {
    ru: "Привычки",
    en: "Habits",
  },
  homeTitle: {
    ru: "Главное",
    en: "Home",
  },
  progressTitle: {
    ru: "Прогресс",
    en: "Progress",
  },
  practiceTitle: {
    ru: "Практика",
    en: "Practice",
  },
  settingsTitle: {
    ru: "Настройки",
    en: "Settings",
  },
  settings: {
    ru: "Настройки",
    en: "Settings",
  },
  appearance: {
    ru: "Внешний вид",
    en: "Appearance",
  },
  theme: {
    ru: "Тема",
    en: "Theme",
  },
  themeSystem: {
    ru: "Системная",
    en: "System",
  },
  themeLight: {
    ru: "Светлая",
    en: "Light",
  },
  themeDark: {
    ru: "Темная",
    en: "Dark",
  },
  language: {
    ru: "Язык",
    en: "Language",
  },
  locale: {
    ru: "Язык",
    en: "Language",
  },
  assistant: {
    ru: "Союзник",
    en: "Assistant",
  },
  ally: {
    ru: "Союзник",
    en: "Ally",
  },
  allyFriend: {
    ru: "Друг",
    en: "Friend",
  },
  allyCoach: {
    ru: "Тренер",
    en: "Coach",
  },
  demoMode: {
    ru: "Демо режим",
    en: "Demo mode",
  },
  demoModeHint: {
    ru: "Попробуйте все возможности приложения с демонстрационными данными",
    en: "Try all app features with demonstration data",
  },
  notifications: {
    ru: "Уведомления",
    en: "Notifications",
  },
  notificationsHint: {
    ru: "Союзник будет присылать напоминания и поддержку",
    en: "Your ally will send reminders and support",
  },
  notificationsEnabled: {
    ru: "Включить уведомления",
    en: "Enable notifications",
  },
  notificationFrequency: {
    ru: "Настойчивость",
    en: "Persistence",
  },
  notificationFrequencyRare: {
    ru: "Редко",
    en: "Rare",
  },
  notificationFrequencyNormal: {
    ru: "Нормально",
    en: "Normal",
  },
  notificationFrequencyPersistent: {
    ru: "Настойчиво",
    en: "Persistent",
  },
  notificationTimeWindow: {
    ru: "Время уведомлений",
    en: "Notification time",
  },
  notificationFrom: {
    ru: "С",
    en: "From",
  },
  notificationTo: {
    ru: "До",
    en: "To",
  },
  archivedHabits: {
    ru: "Архив",
    en: "Archived",
  },
  restore: {
    ru: "Вернуть",
    en: "Restore",
  },
  delete: {
    ru: "Удалить",
    en: "Delete",
  },
  exportData: {
    ru: "Экспорт данных",
    en: "Export Data",
  },
  importData: {
    ru: "Импорт данных",
    en: "Import Data",
  },
  exportDataHint: {
    ru: "Сохраните все ваши привычки, записи и настройки в файл",
    en: "Save all your habits, entries and settings to a file",
  },
  importDataHint: {
    ru: "Восстановите данные из ранее сохраненного файла",
    en: "Restore data from a previously saved file",
  },
  importError: {
    ru: "Ошибка импорта: неверный пароль или поврежденный файл",
    en: "Import error: invalid password or corrupted file",
  },
  exportPasswordTitle: {
    ru: "Защита паролем",
    en: "Password Protection",
  },
  exportPasswordDescription: {
    ru: "Введите пароль для шифрования архива",
    en: "Enter a password to encrypt the archive",
  },
  importPasswordTitle: {
    ru: "Введите пароль",
    en: "Enter Password",
  },
  importPasswordDescription: {
    ru: "Введите пароль для расшифровки архива",
    en: "Enter the password to decrypt the archive",
  },
  passwordPlaceholder: {
    ru: "Пароль",
    en: "Password",
  },
  export: {
    ru: "Экспорт",
    en: "Export",
  },
  import: {
    ru: "Импорт",
    en: "Import",
  },
  deleteConfirmTitle: {
    ru: "Удалить привычку?",
    en: "Delete habit?",
  },
  deleteConfirmDescription: {
    ru: "Удаление необратимо. Привычка исчезнет из Архива и статистики.",
    en: "This action is permanent. The habit will be removed from the archive and statistics.",
  },
  deleteAnchorTitle: {
    ru: "Удалить якорь?",
    en: "Delete anchor?",
  },
  deleteAnchorDescription: {
    ru: "Якорь будет удалён без возможности восстановления.",
    en: "The anchor will be removed permanently.",
  },
  deleteJournalTitle: {
    ru: "Удалить запись?",
    en: "Delete entry?",
  },
  deleteJournalDescription: {
    ru: "Запись исчезнет из журнала навсегда.",
    en: "This entry will be removed from the journal permanently.",
  },
  archive: {
    ru: "Архивировать",
    en: "Archive",
  },
  archiveConfirmTitle: {
    ru: "Архивировать привычку?",
    en: "Archive habit?",
  },
  archiveConfirmDescription: {
    ru: "Привычка будет перенесена в Архив в Настройках.",
    en: "The habit will be moved to Archived in Settings.",
  },
  yes: {
    ru: "Да",
    en: "Yes",
  },
  no: {
    ru: "Нет",
    en: "No",
  },
  streakGoal: {
    ru: "Цель серии",
    en: "Streak goal",
  },
  none: {
    ru: "Нет",
    en: "None",
  },
  calendar: {
    ru: "Календарь",
    en: "Calendar",
  },
  quickEntry: {
    ru: "Быстрый ввод",
    en: "Quick entry",
  },
  selectDate: {
    ru: "Выберите дату",
    en: "Select date",
  },
  quickStart: {
    ru: "Стартовая оболочка готова. Дальше переносим экраны из старой версии.",
    en: "Baseline shell is ready. Next we migrate screens from the legacy app.",
  },
  addHabit: {
    ru: "Добавить привычку",
    en: "Add habit",
  },
  addHabitTitle: {
    ru: "Новая привычка",
    en: "New habit",
  },
  editHabitTitle: {
    ru: "Редактировать привычку",
    en: "Edit habit",
  },
  habitName: {
    ru: "Название",
    en: "Name",
  },
  habitDescription: {
    ru: "Описание",
    en: "Description",
  },
  dailyTarget: {
    ru: "Выполнений в день",
    en: "Daily target",
  },
  category: {
    ru: "Категория",
    en: "Category",
  },
  save: {
    ru: "Сохранить",
    en: "Save",
  },
  cancel: {
    ru: "Отмена",
    en: "Cancel",
  },
  priority: {
    ru: "Приоритет",
    en: "Priority",
  },
  streak: {
    ru: "Серия",
    en: "Streak",
  },
  progress: {
    ru: "Прогресс",
    en: "Progress",
  },
  progressOverview: {
    ru: "Обзор",
    en: "Overview",
  },
  progressInsight: {
    ru: "Инсайт за период",
    en: "Insight for the period",
  },
  progressQuote: {
    ru: "Цитата",
    en: "Quote",
  },
  dynamics: {
    ru: "Динамика",
    en: "Dynamics",
  },
  periodWeek: {
    ru: "Неделя",
    en: "Week",
  },
  periodMonth: {
    ru: "Месяц",
    en: "Month",
  },
  periodYear: {
    ru: "Год",
    en: "Year",
  },
  period30Days: {
    ru: "30 дней",
    en: "30 days",
  },
  filterAll: {
    ru: "Все",
    en: "All",
  },
  achievements: {
    ru: "Достижения",
    en: "Achievements",
  },
  noUnlockedAchievements: {
    ru: "Пока нет открытых достижений.",
    en: "No achievements yet.",
  },
  rareAchievement: {
    ru: "Редкое достижение",
    en: "Rare achievement",
  },
  legendaryAchievement: {
    ru: "Легендарное",
    en: "Legendary",
  },
  achievementsPriorityHabits: {
    ru: "Приоритетные привычки",
    en: "Priority habits",
  },
  achievementsHabits: {
    ru: "Привычки",
    en: "Habits",
  },
  achievementsApp: {
    ru: "Приложение",
    en: "App",
  },
  achievementsJournal: {
    ru: "Журнал",
    en: "Journal",
  },
  achievementsDiscipline: {
    ru: "Дисциплина",
    en: "Discipline",
  },
  dialogDetails: {
    ru: "Детали",
    en: "Details",
  },
  totalDoneAll: {
    ru: "Выполнено всего",
    en: "Total done",
  },
  avgRhythm: {
    ru: "Средний ритм",
    en: "Average rhythm",
  },
  activeHabits: {
    ru: "Активные привычки",
    en: "Active habits",
  },
  openSettings: {
    ru: "Открыть настройки",
    en: "Open settings",
  },
  dailyFocus: {
    ru: "Фокус дня",
    en: "Daily focus",
  },
  anchors: {
    ru: "Якоря",
    en: "Anchors",
  },
  journal: {
    ru: "Журнал",
    en: "Journal",
  },
  addEntry: {
    ru: "Записать",
    en: "New entry",
  },
  filter: {
    ru: "Фильтр",
    en: "Filter",
  },
  filterActive: {
    ru: "Активен",
    en: "Active",
  },
  sortNewest: {
    ru: "Новые",
    en: "Newest",
  },
  sortOldest: {
    ru: "Старые",
    en: "Oldest",
  },
  collapseAll: {
    ru: "Свернуть",
    en: "Collapse",
  },
  expandAll: {
    ru: "Развернуть",
    en: "Expand",
  },
  journalFilter: {
    ru: "Фильтр записей",
    en: "Filter entries",
  },
  period: {
    ru: "Период",
    en: "Period",
  },
  period_all: {
    ru: "Все",
    en: "All",
  },
  period_today: {
    ru: "Сегодня",
    en: "Today",
  },
  period_week: {
    ru: "Неделя",
    en: "Week",
  },
  period_month: {
    ru: "Месяц",
    en: "Month",
  },
  period_year: {
    ru: "Год",
    en: "Year",
  },
  apply: {
    ru: "Применить",
    en: "Apply",
  },
  reset: {
    ru: "Сбросить",
    en: "Reset",
  },
  showMore: {
    ru: "Показать ещё",
    en: "Show more",
  },
  entryTypeText: {
    ru: "Текст",
    en: "Text",
  },
  entryTypeAudio: {
    ru: "Аудио",
    en: "Audio",
  },
  sharePlaceholder: {
    ru: "Что сейчас чувствуешь?",
    en: "What are you feeling right now?",
  },
  emotions: {
    ru: "Эмоции",
    en: "Emotions",
  },
  спокойствие: {
    ru: "Спокойствие",
    en: "Calm",
  },
  энергия: {
    ru: "Энергия",
    en: "Energy",
  },
  благодарность: {
    ru: "Благодарность",
    en: "Gratitude",
  },
  любовь: {
    ru: "Любовь",
    en: "Love",
  },
  гордость: {
    ru: "Гордость",
    en: "Pride",
  },
  уверенность: {
    ru: "Уверенность",
    en: "Confidence",
  },
  фокус: {
    ru: "Фокус",
    en: "Focus",
  },
  вдохновение: {
    ru: "Вдохновение",
    en: "Inspiration",
  },
  тревога: {
    ru: "Тревога",
    en: "Anxiety",
  },
  грусть: {
    ru: "Грусть",
    en: "Sadness",
  },
  today: {
    ru: "Сегодня",
    en: "Today",
  },
  week: {
    ru: "Неделя",
    en: "Week",
  },
  month: {
    ru: "Месяц",
    en: "Month",
  },
  year: {
    ru: "Год",
    en: "Year",
  },
  all: {
    ru: "Все",
    en: "All",
  },
  attachAudio: {
    ru: "Прикрепить аудио",
    en: "Attach audio",
  },
  audioAttached: {
    ru: "Аудио добавлено",
    en: "Audio attached",
  },
  recordAudio: {
    ru: "Записать голос",
    en: "Record audio",
  },
  stopRecording: {
    ru: "Остановить",
    en: "Stop",
  },
  recording: {
    ru: "Идет запись...",
    en: "Recording...",
  },
  maxChars: {
    ru: "Максимум 1000 символов",
    en: "Max 1000 characters",
  },
  newStopCrane: {
    ru: "Добавить якорь",
    en: "Add anchor",
  },
  newEntryTitle: {
    ru: "Новая запись",
    en: "New entry",
  },
  newAnchorTitle: {
    ru: "Новый якорь",
    en: "New anchor",
  },
  content: {
    ru: "Контент",
    en: "Content",
  },
  link: {
    ru: "Ссылка",
    en: "Link",
  },
  audio: {
    ru: "Аудио",
    en: "Audio",
  },
  radio: {
    ru: "Радио",
    en: "Radio",
  },
  image: {
    ru: "Изображение",
    en: "Image",
  },
  stopAnchor: {
    ru: "STOP",
    en: "STOP",
  },
  chooseFile: {
    ru: "Выберите файл",
    en: "Choose file",
  },
  fileTooLarge: {
    ru: "Файл слишком большой",
    en: "File too large",
  },
  maxSizeImage: {
    ru: "Макс. размер изображения: 5MB",
    en: "Max image size: 5MB",
  },
  maxSizeAudio: {
    ru: "Макс. размер аудио: 10MB",
    en: "Max audio size: 10MB",
  },
  linkInvalid: {
    ru: "Неверный формат ссылки",
    en: "Invalid link format",
  },
  textLimit: {
    ru: "Текст до 200 символов",
    en: "Text up to 200 chars",
  },
  linkLimit: {
    ru: "Ссылка до 500 символов",
    en: "Link up to 500 chars",
  },
  replaceAudio: {
    ru: "Аудио будет заменено",
    en: "Audio will be replaced",
  },
  replaceRadio: {
    ru: "Радио будет заменено",
    en: "Radio will be replaced",
  },
  replaceStop: {
    ru: "STOP будет заменён",
    en: "STOP will be replaced",
  },
  buffering: {
    ru: "Буферизация...",
    en: "Buffering...",
  },
  playing: {
    ru: "Играет",
    en: "Playing",
  },
  stopped: {
    ru: "Остановлено",
    en: "Stopped",
  },
  text: {
    ru: "Текст",
    en: "Text",
  },
  noEntriesYet: {
    ru: "Пока нет записей.",
    en: "No entries yet.",
  },
  pinAnchorsEmpty: {
    ru: "Закрепи опоры — фото, музыку, текст или ссылку.",
    en: "Pin anchors — photos, music, text, or a link.",
  },
  emptyHabits: {
    ru: "Нет привычек. Создай первую.",
    en: "No habits yet. Create the first one.",
  },
  completed: {
    ru: "Выполнено",
    en: "Completed",
  },
  targetPerDay: {
    ru: "цель/день",
    en: "target/day",
  },
  drag: {
    ru: "Перетащить",
    en: "Drag",
  },
  close: {
    ru: "Закрыть",
    en: "Close",
  },
  community: {
    ru: "Сообщество",
    en: "Community",
  },
  communityHint: {
    ru: "Присоединяйтесь к нашему Telegram-каналу для поддержки и обновлений",
    en: "Join our Telegram channel for support and updates",
  },
  joinCommunity: {
    ru: "Присоединиться",
    en: "Join",
  },
};

export const t = (key: keyof typeof dictionary, locale: Locale) => {
  return dictionary[key]?.[locale] ?? dictionary[key]?.ru ?? "";
};
