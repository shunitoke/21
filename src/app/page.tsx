"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Home as HomeIcon, LineChart, Loader2, Plus, Settings, Sparkles } from "lucide-react";
import HomeScreen from "@/components/screens/HomeScreen";
import ProgressScreen from "@/components/screens/ProgressScreen";
import PracticeScreen from "@/components/screens/PracticeScreen";
import SettingsScreen from "@/components/screens/SettingsScreen";
import HabitModal from "@/components/HabitModal";
import type { Habit, HabitCategoryId, JournalEntry, Locale, StopCraneItem, ThemePreference } from "@/lib/types";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import { getCategoryColor } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { getThemePreference } from "@/services/storage";
import { InteractiveTutorial } from "@/components/InteractiveTutorial";
import { Spotlight, useSpotlightTour } from "@/components/Spotlight";
import { vibrationFeedback } from "@/utils/vibrationUtils";
import { useSafeArea } from "@/hooks/useSafeArea";
import { useBackButton } from "@/hooks/useBackButton";

export default function Home() {
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [spotlightStep, setSpotlightStep] = useState(0);
  const [hasDialogOverlay, setHasDialogOverlay] = useState(false);
  const [transitionDir, setTransitionDir] = useState(0);
  const [radioSrc, setRadioSrc] = useState<string | null>(null);
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioBuffering, setRadioBuffering] = useState(false);
  const [exitToast, setExitToast] = useState("");
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingScrollResetRef = useRef(false);
  const didSwipeRef = useRef(false);
  const dragStartXRef = useRef<number | null>(null);
  const [frozenSnapshot, setFrozenSnapshot] = useState<{
    screen: ReturnType<typeof useAppStore.getState>["screen"];
    sortedHabits: Habit[];
    logs: ReturnType<typeof useAppStore.getState>["logs"];
    journal: ReturnType<typeof useAppStore.getState>["journal"];
    stopCrane: ReturnType<typeof useAppStore.getState>["stopCrane"];
    achievements: ReturnType<typeof useAppStore.getState>["achievements"];
    settings: ReturnType<typeof useAppStore.getState>["settings"];
    loading: ReturnType<typeof useAppStore.getState>["loading"];
  } | null>(null);
  const safeArea = useSafeArea();
  const {
    screen,
    setScreen,
    habits,
    logs,
    journal,
    stopCrane,
    loading,
    toast,
    settings,
    achievements,
    init,
    toggleHabitToday,
    toggleHabitDate,
    setHabitDate,
    addHabit,
    updateHabit,
    updateSettings,
    restoreHabit,
    removeHabit,
    reorderHabits,
    addJournalEntry,
    removeJournalEntry,
    addStopCrane,
    removeStopCrane,
    replaceStopCrane,
    clearToast,
    importData,
    completeTutorial,
  } = useAppStore();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    // Show tutorial on first launch if not completed
    if (!loading && !settings.tutorialCompleted) {
      setShowTutorial(true);
    }
  }, [loading, settings.tutorialCompleted]);

  useEffect(() => {
    const root = document.querySelector<HTMLDivElement>(".app-root");
    if (root) root.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    pendingScrollResetRef.current = true;
  }, [screen]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => clearToast(), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast, clearToast]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const applyTheme = (mode: ThemePreference) => {
      if (mode === "system") {
        const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
        root.dataset.theme = isDark ? "dark" : "light";
        root.dataset.appearance = isDark ? "dark" : "light";
        return;
      }
      root.dataset.theme = mode;
      root.dataset.appearance = mode;
    };

    // Get theme from IndexedDB
    getThemePreference().then((storedTheme: string | null) => {
      const themeToApply = (storedTheme as ThemePreference) ?? settings.theme;
      applyTheme(themeToApply);
    });

    if (settings.theme !== "system") return;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media?.addEventListener?.("change", handler);
    return () => media?.removeEventListener?.("change", handler);
  }, [loading, settings.theme]);

  useEffect(() => {
    const audio = radioAudioRef.current;
    if (!audio) return;
    const handlePlaying = () => {
      setRadioPlaying(true);
      setRadioBuffering(false);
    };
    const handlePause = () => {
      setRadioPlaying(false);
      setRadioBuffering(false);
    };
    const handleEnded = () => {
      setRadioPlaying(false);
      setRadioBuffering(false);
    };
    const handleStalled = () => {
      setRadioPlaying(false);
      setRadioBuffering(false);
    };
    const handleError = () => {
      setRadioPlaying(false);
      setRadioBuffering(false);
    };
    const handleWaiting = () => setRadioBuffering(true);
    const handleCanPlay = () => setRadioBuffering(false);
    const handleCanPlayThrough = () => setRadioBuffering(false);
    const handleLoadedData = () => setRadioBuffering(false);
    const handleTimeUpdate = () => {
      if (!audio.paused && audio.readyState >= 3) {
        setRadioBuffering(false);
      }
    };

    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("play", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("stalled", handleStalled);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("canplaythrough", handleCanPlayThrough);
    audio.addEventListener("loadeddata", handleLoadedData);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    const handleVisibility = () => {
      if (document.hidden) {
        setRadioBuffering(false);
        setRadioPlaying(!audio.paused && !audio.ended);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("play", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("stalled", handleStalled);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      audio.removeEventListener("loadeddata", handleLoadedData);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [radioSrc]);

  const sortedHabits = useMemo(
    () =>
      [...habits]
        .filter((habit) => !habit.archived)
        .sort((a, b) => {
          if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
          return a.order - b.order;
        }),
    [habits]
  );

  const mainScreens = useMemo(() => ["home", "progress", "practice"] as const, []);
  const mainScreenIndex = useCallback(
    (value: ReturnType<typeof useAppStore.getState>["screen"]) => mainScreens.indexOf(value as (typeof mainScreens)[number]),
    [mainScreens]
  );

  const goToMainIndex = useCallback(
    (nextIndex: number) => {
      const currentIndex = mainScreenIndex(screen);
      if (currentIndex === -1) return;
      const clamped = Math.max(0, Math.min(mainScreens.length - 1, nextIndex));
      if (clamped === currentIndex) return;
      const dir = Math.sign(clamped - currentIndex);
      flushSync(() => setTransitionDir(dir));
      setScreen(mainScreens[clamped]);
    },
    [mainScreenIndex, mainScreens, screen, setScreen]
  );

  const setScreenWithDirection = useCallback(
    (next: ReturnType<typeof useAppStore.getState>["screen"]) => {
      const from = mainScreenIndex(screen);
      const to = mainScreenIndex(next);
      if (from !== -1 && to !== -1) {
        const dir = Math.sign(to - from);
        flushSync(() => setTransitionDir(dir));
      } else {
        flushSync(() => setTransitionDir(0));
      }
      setScreen(next);
    },
    [mainScreenIndex, screen, setScreen]
  );

  useEffect(() => {
    const getHasOverlay = () =>
      Boolean(document.querySelector('[data-slot="dialog-overlay"][data-state="open"]'));
    const update = () => {
      const next = getHasOverlay();
      setHasDialogOverlay(next);
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasDialogOverlay) {
      setFrozenSnapshot(null);
      return;
    }

    setFrozenSnapshot((prev) => {
      if (prev) return prev;
      return {
        screen,
        sortedHabits,
        logs,
        journal,
        stopCrane,
        achievements,
        settings,
        loading,
      };
    });
  }, [achievements, hasDialogOverlay, journal, loading, logs, screen, settings, sortedHabits, stopCrane]);

  const background = frozenSnapshot ?? {
    screen,
    sortedHabits,
    logs,
    journal,
    stopCrane,
    achievements,
    settings,
    loading,
  };

  const handleToggle = (habitId: string, isPriority: boolean, dailyTarget = 1) => {
    toggleHabitToday(habitId, isPriority, dailyTarget);
  };

  const handleToggleRadio = useCallback(
    (src: string) => {
      const audio = radioAudioRef.current;
      if (!audio) return;
      const isCurrentlyPlaying = !audio.paused && !audio.ended;
      if (isCurrentlyPlaying && radioSrc === src) {
        audio.pause();
        setRadioBuffering(false);
        return;
      }
      if (radioSrc !== src) {
        audio.src = src;
        audio.load();
        setRadioSrc(src);
      }
      setRadioBuffering(true);
      audio
        .play()
        .then(() => {
          setRadioPlaying(true);
          setRadioBuffering(false);
        })
        .catch(() => {
          setRadioPlaying(false);
          setRadioBuffering(false);
        });
    },
    [radioSrc]
  );

  const handleAddJournal = (entry: JournalEntry) => {
    addJournalEntry(entry);
  };

  const handleReorderHabits = (orderedIds: string[]) => {
    reorderHabits(orderedIds);
  };

  const handleReorderStopCrane = (next: StopCraneItem[]) => {
    replaceStopCrane(next);
  };

  const handleHabitSubmit = (payload: {
    name: string;
    description?: string;
    dailyTarget: number;
    category?: HabitCategoryId | null;
    isPriority: boolean;
    streakGoal?: number | null;
    remindersPerDay?: number;
    trackingMode?: Habit["trackingMode"];
  }) => {
    if (selectedHabit) {
      updateHabit({
        ...selectedHabit,
        name: payload.name,
        description: payload.description,
        dailyTarget: payload.dailyTarget,
        category: payload.category ?? null,
        isPriority: payload.isPriority,
        colorToken: getCategoryColor(payload.category ?? selectedHabit.category ?? null),
        streakGoal: payload.streakGoal !== undefined ? payload.streakGoal : selectedHabit.streakGoal ?? null,
        remindersPerDay: payload.remindersPerDay ?? selectedHabit.remindersPerDay,
        trackingMode: payload.trackingMode ?? selectedHabit.trackingMode,
      });
    } else {
      addHabit({
        id: `habit-${Date.now()}`,
        name: payload.name,
        description: payload.description,
        dailyTarget: payload.dailyTarget,
        category: payload.category ?? null,
        isPriority: payload.isPriority,
        colorToken: getCategoryColor(payload.category ?? null),
        streakGoal: payload.streakGoal ?? null,
        remindersPerDay: payload.remindersPerDay ?? 0,
        trackingMode: payload.trackingMode ?? "step",
        order: habits.length,
        createdAt: new Date().toISOString(),
      });
    }
    setHabitModalOpen(false);
    setSelectedHabit(null);
  };

  const handleArchiveHabit = () => {
    if (!selectedHabit) return;
    updateHabit({ ...selectedHabit, archived: true });
    setHabitModalOpen(false);
    setSelectedHabit(null);
  };

  const handleDeleteHabit = () => {
    if (!selectedHabit) return;
    removeHabit(selectedHabit.id);
    setHabitModalOpen(false);
    setSelectedHabit(null);
  };

  const handleAddStopCrane = (item: StopCraneItem) => {
    addStopCrane(item);
  };

  const locale: Locale = settings.locale;

  // Back button handling for Android
  useBackButton({
    isModalOpen: habitModalOpen,
    onCloseModal: () => {
      setHabitModalOpen(false);
      setSelectedHabit(null);
    },
    isSettingsOpen: settingsOpen,
    onCloseSettings: () => setSettingsOpen(false),
    canExit: true,
    onExit: () => {
      const isNative = typeof window !== "undefined" && typeof (window as any).Capacitor !== "undefined";
      if (isNative) {
        import("@capacitor/app").then(({ App }) => App.exitApp());
      }
    },
    exitMessage: locale === "ru" ? "Нажмите ещё раз для выхода" : "Press again to exit",
    onShowToast: setExitToast,
  });

  const screenVariants = useMemo(
    () => ({
      enter: (direction: number) => ({
        x: direction === 0 ? "0%" : direction > 0 ? "100%" : "-100%",
        opacity: 1,
        position: "relative" as const,
      }),
      center: { x: "0%", opacity: 1, position: "relative" as const },
      exit: (direction: number) => ({
        x: direction === 0 ? "0%" : direction > 0 ? "-100%" : "100%",
        opacity: 1,
        position: "absolute" as const,
      }),
    }),
    []
  );

  const handleSwipe = useCallback(
    (delta: number) => {
      if (hasDialogOverlay) return;
      const currentIndex = mainScreenIndex(screen);
      if (currentIndex === -1) return;
      goToMainIndex(currentIndex + delta);
    },
    [goToMainIndex, hasDialogOverlay, mainScreenIndex, screen]
  );

  if (background.loading) {
    return (
      <div className="app-root flex min-h-[100svh] items-center justify-center bg-background px-4 pb-28 pt-[max(24px,env(safe-area-inset-top))] text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/70" aria-label={locale === "ru" ? "Загрузка" : "Loading"} />
      </div>
    );
  }

  return (
    <div
      className="app-root flex min-h-[100svh] flex-col w-full max-w-full box-border overflow-x-hidden px-4 pb-28 pt-[max(24px,env(safe-area-inset-top))] text-foreground"
      style={{ maxWidth: '100vw', overflowX: 'hidden', touchAction: 'pan-y' }}
      onClickCapture={(event) => {
        if (!didSwipeRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        didSwipeRef.current = false;
      }}
    >
      <header className="mb-6 flex items-center justify-between gap-4 overflow-hidden" style={{ maxWidth: '100%', overflowX: 'hidden', minWidth: '0', boxSizing: 'border-box' }}>
        <div className="flex items-baseline gap-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={t("settingsTitle", locale)}
            onClick={() => {
              vibrationFeedback.buttonPress();
              setSettingsOpen(true);
            }}
            data-tutorial-target="settings"
          >
            <Settings size={16} />
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-semibold" style={{ lineHeight: '1' }}>
            <span
              className="text-2xl font-bold italic sm:text-3xl"
              style={{ fontFamily: '"Zvezda NHZDN Bold Italic"', lineHeight: '1' }}
            >
              {locale === "ru" ? "Программа" : "Program"}
            </span>
            <span
              className="text-3xl font-bold italic sm:text-4xl"
              style={{ fontFamily: '"Zvezda NHZDN Bold Italic"', lineHeight: '1' }}
            >
              21
            </span>
            <span className="flex h-5 items-end gap-1 text-current">
              {[10, 16, 12, 18].map((height, index) => (
                <span
                  key={`spectrum-${height}`}
                  className={`w-1 rounded-full bg-current ${radioPlaying ? "opacity-90" : "opacity-55"}`}
                  style={{
                    height,
                    animation: radioPlaying ? "spectrumPulse 1.2s ease-in-out infinite" : "none",
                    animationDelay: radioPlaying ? `${index * 0.15}s` : undefined,
                  }}
                />
              ))}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="default"
            aria-label={t("addHabit", locale)}
            onClick={() => {
              vibrationFeedback.buttonPress();
              setSelectedHabit(null);
              setHabitModalOpen(true);
            }}
            data-tutorial-target="add"
          >
            <Plus size={16} />
          </Button>
        </div>
      </header>
      <div
        className="flex flex-1 flex-col"
        style={{ position: "relative", overflow: "hidden", width: "100%" }}
        onPointerDown={(e) => {
          if (background.screen !== "home" && background.screen !== "progress" && background.screen !== "practice") return;
          dragStartXRef.current = e.clientX;
          didSwipeRef.current = false;
        }}
        onPointerMove={(e) => {
          if (dragStartXRef.current === null) return;
          const dx = e.clientX - dragStartXRef.current;
          if (Math.abs(dx) > 10) didSwipeRef.current = true;
        }}
        onPointerUp={(e) => {
          if (dragStartXRef.current === null) return;
          if (hasDialogOverlay) {
            dragStartXRef.current = null;
            return;
          }
          const dx = e.clientX - dragStartXRef.current;
          if (dx < -60) {
            handleSwipe(1);
          } else if (dx > 60) {
            handleSwipe(-1);
          }
          dragStartXRef.current = null;
        }}
      >
        <AnimatePresence
          initial={true}
          custom={transitionDir}
          onExitComplete={() => {
            if (!pendingScrollResetRef.current) return;
            pendingScrollResetRef.current = false;
            const root = document.querySelector<HTMLDivElement>(".app-root");
            if (root) root.scrollTo({ top: 0, left: 0, behavior: "auto" });
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          }}
        >
        <motion.div
          key={background.screen}
          custom={transitionDir}
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="w-full flex-1"
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          drag={background.screen === "home" || background.screen === "progress" || background.screen === "practice" ? "x" : false}
          dragListener={false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          style={{ touchAction: "pan-y" }}
        >
          {background.screen === "home" && (
            <HomeScreen
              locale={locale}
              habits={background.sortedHabits}
              logs={background.logs}
              onToggle={handleToggle}
              onOpen={(habit) => {
                setSelectedHabit(habit);
                setHabitModalOpen(true);
              }}
              onAdd={() => {
                setSelectedHabit(null);
                setHabitModalOpen(true);
              }}
              onReorderHabits={handleReorderHabits}
            />
          )}
          {background.screen === "progress" && (
            <ProgressScreen
              locale={locale}
              habits={background.sortedHabits}
              logs={background.logs}
              achievements={background.achievements}
              journal={background.journal}
              isActive={background.screen === "progress"}
            />
          )}
          {background.screen === "practice" && (
            <PracticeScreen
              locale={locale}
              journal={background.journal}
              stopCrane={background.stopCrane}
              onAddJournal={handleAddJournal}
              onRemoveJournal={removeJournalEntry}
              onAddStopCrane={handleAddStopCrane}
              onRemoveStopCrane={removeStopCrane}
              onReorderStopCrane={handleReorderStopCrane}
              radioSrc={radioSrc}
              radioPlaying={radioPlaying}
              radioBuffering={radioBuffering}
              onToggleRadio={handleToggleRadio}
            />
          )}
        </motion.div>
      </AnimatePresence>
      </div>
      <audio ref={radioAudioRef} preload="none" />
      <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-3 shadow-lg backdrop-blur-md">
          <Button
            type="button"
            size="icon-lg"
            variant={background.screen === "home" ? "default" : "ghost"}
            aria-label={t("homeTitle", locale)}
            onClick={() => {
              vibrationFeedback.tabSwitch();
              setScreenWithDirection("home");
            }}
            data-tutorial-target="nav-home"
          >
            <HomeIcon size={18} />
          </Button>
          <Button
            type="button"
            size="icon-lg"
            variant={background.screen === "progress" ? "default" : "ghost"}
            aria-label={t("progressTitle", locale)}
            onClick={() => {
              vibrationFeedback.tabSwitch();
              setScreenWithDirection("progress");
            }}
            data-tutorial-target="nav-progress"
          >
            <LineChart size={18} />
          </Button>
          <Button
            type="button"
            size="icon-lg"
            variant={background.screen === "practice" ? "default" : "ghost"}
            aria-label={t("practiceTitle", locale)}
            onClick={() => {
              vibrationFeedback.tabSwitch();
              setScreenWithDirection("practice");
            }}
            data-tutorial-target="nav-practice"
          >
            <Sparkles size={18} />
          </Button>
        </div>
      </nav>
      <HabitModal
        open={habitModalOpen}
        locale={locale}
        habit={selectedHabit}
        logs={selectedHabit ? logs.filter((log) => log.habitId === selectedHabit.id) : []}
        onClose={() => {
          setHabitModalOpen(false);
          setSelectedHabit(null);
        }}
        onArchive={handleArchiveHabit}
        onDelete={handleDeleteHabit}
        onToggleDate={toggleHabitDate}
        onSetDate={setHabitDate}
        onSubmit={handleHabitSubmit}
      />
      <Dialog open={settingsOpen} onOpenChange={(value) => (!value ? setSettingsOpen(false) : null)}>
        <DialogContent className="group max-w-[560px] data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left">
          <DialogHeader>
            <DialogTitle>{t("settingsTitle", locale)}</DialogTitle>
            <DialogDescription className="sr-only">{t("dialogDetails", locale)}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto group-data-[state=open]:animate-in group-data-[state=open]:fade-in-0 group-data-[state=open]:slide-in-from-bottom-2 group-data-[state=open]:duration-200">
            <SettingsScreen
              locale={locale}
              settings={settings}
              habits={habits}
              onUpdate={updateSettings}
              onRestore={restoreHabit}
              onDelete={removeHabit}
              onImportData={importData}
            />
          </div>
        </DialogContent>
      </Dialog>
      {toast && (
        <button
          type="button"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-lg"
          onClick={() => clearToast()}
        >
          {toast}
        </button>
      )}
      {exitToast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-popover px-4 py-2 text-xs text-popover-foreground shadow-lg">
          {exitToast}
        </div>
      )}
      {showTutorial && (
        <InteractiveTutorial
          locale={locale}
          onComplete={() => {
            setShowTutorial(false);
            completeTutorial();
            setShowSpotlight(true);
            setSpotlightStep(0);
          }}
          onSkip={() => {
            setShowTutorial(false);
            completeTutorial();
            setShowSpotlight(true);
            setSpotlightStep(0);
          }}
        />
      )}
      {/* Spotlight tour steps */}
      <Spotlight
        targetSelector='[data-tutorial-target="add"]'
        isActive={showSpotlight && spotlightStep === 0}
        title={locale === "ru" ? "Добавление привычек" : "Add Habits"}
        description={
          locale === "ru"
            ? "Нажмите здесь, чтобы создать новую привычку. Задайте название, категорию и цель."
            : "Click here to create a new habit. Set name, category and goal."
        }
        locale={locale}
        stepNumber={1}
        totalSteps={5}
        onNext={() => setSpotlightStep(1)}
        onSkip={() => setShowSpotlight(false)}
      />
      <Spotlight
        targetSelector='[data-tutorial-target="nav-home"]'
        isActive={showSpotlight && spotlightStep === 1}
        title={locale === "ru" ? "Главный экран" : "Home Screen"}
        description={
          locale === "ru"
            ? "Здесь находятся все ваши привычки. Отмечайте выполнение одним касанием."
            : "All your habits are here. Mark completion with one tap."
        }
        locale={locale}
        stepNumber={2}
        totalSteps={5}
        onNext={() => setSpotlightStep(2)}
        onSkip={() => setShowSpotlight(false)}
      />
      <Spotlight
        targetSelector='[data-tutorial-target="nav-progress"]'
        isActive={showSpotlight && spotlightStep === 2}
        title={locale === "ru" ? "Прогресс" : "Progress"}
        description={
          locale === "ru"
            ? "Следите за статистикой, достижениями и динамикой выполнения."
            : "Track statistics, achievements and completion dynamics."
        }
        locale={locale}
        stepNumber={3}
        totalSteps={5}
        onNext={() => setSpotlightStep(3)}
        onSkip={() => setShowSpotlight(false)}
      />
      <Spotlight
        targetSelector='[data-tutorial-target="nav-practice"]'
        isActive={showSpotlight && spotlightStep === 3}
        title={locale === "ru" ? "Практика" : "Practice"}
        description={
          locale === "ru"
            ? "Журнал для записей и якоря — ваши опоры в трудные моменты."
            : "Journal for entries and anchors — your supports in tough moments."
        }
        locale={locale}
        stepNumber={4}
        totalSteps={5}
        onNext={() => setSpotlightStep(4)}
        onSkip={() => setShowSpotlight(false)}
      />
      <Spotlight
        targetSelector='[data-tutorial-target="settings"]'
        isActive={showSpotlight && spotlightStep === 4}
        title={locale === "ru" ? "Настройки" : "Settings"}
        description={
          locale === "ru"
            ? "Настройте тему, язык и включите демо-режим для изучения функций."
            : "Customize theme, language and enable demo mode to explore features."
        }
        locale={locale}
        stepNumber={5}
        totalSteps={5}
        onNext={() => setShowSpotlight(false)}
        onSkip={() => setShowSpotlight(false)}
      />
      <PWAInstallPrompt />
    </div>
  );
}
