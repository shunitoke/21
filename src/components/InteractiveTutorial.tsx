"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, LineChart, Sparkles, Plus, Settings, CheckCircle2, Flame, Trophy, Mic, Link2, Type } from "lucide-react";
import type { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";

interface TutorialStep {
  id: string;
  title: { ru: string; en: string };
  description: { ru: string; en: string };
  icon: React.ReactNode;
  target?: "home" | "progress" | "practice" | "add" | "settings";
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: { ru: "Добро пожаловать!", en: "Welcome!" },
    description: {
      ru: "Программа 21 — ваш персональный тренажёр привычек. Давайте познакомимся с основными функциями.",
      en: "Program 21 is your personal habit trainer. Let's explore the main features.",
    },
    icon: <Sparkles className="h-8 w-8 text-primary" />,
  },
  {
    id: "home",
    title: { ru: "Главный экран", en: "Home Screen" },
    description: {
      ru: "Здесь находятся все ваши привычки. Отмечайте выполнение одним касанием. Приоритетные привычки показаны вверху.",
      en: "All your habits are here. Mark completion with one tap. Priority habits are shown at the top.",
    },
    icon: <Home className="h-8 w-8 text-primary" />,
    target: "home",
  },
  {
    id: "flames",
    title: { ru: "Система огня", en: "Fire System" },
    description: {
      ru: "Огни показывают вашу дисциплину по неделям. 5+ дней в неделю = успешная неделя. Набирайте серии!",
      en: "Flames show your weekly discipline. 5+ days per week = successful week. Build streaks!",
    },
    icon: <Flame className="h-8 w-8 text-orange-500" />,
  },
  {
    id: "add",
    title: { ru: "Создание привычек", en: "Creating Habits" },
    description: {
      ru: "Нажмите + чтобы добавить привычку. Задайте название, категорию и цель. Отметьте важные как Приоритетные.",
      en: "Tap + to add a habit. Set name, category and goal. Mark important ones as Priority.",
    },
    icon: <Plus className="h-8 w-8 text-primary" />,
    target: "add",
  },
  {
    id: "progress",
    title: { ru: "Прогресс", en: "Progress" },
    description: {
      ru: "Следите за статистикой, достижениями и динамикой. Календарь показывает историю выполнения.",
      en: "Track statistics, achievements and dynamics. Calendar shows completion history.",
    },
    icon: <LineChart className="h-8 w-8 text-primary" />,
    target: "progress",
  },
  {
    id: "achievements",
    title: { ru: "Достижения", en: "Achievements" },
    description: {
      ru: "Открывайте достижения за регулярность. Легендарные достижения даются за 60+ дней серии.",
      en: "Unlock achievements for consistency. Legendary ones require 60+ day streaks.",
    },
    icon: <Trophy className="h-8 w-8 text-yellow-500" />,
  },
  {
    id: "practice",
    title: { ru: "Практика", en: "Practice" },
    description: {
      ru: "Журнал для записей и якоря — ваши опоры. Добавляйте текст, аудио, ссылки и изображения.",
      en: "Journal for entries and anchors — your supports. Add text, audio, links and images.",
    },
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    target: "practice",
  },
  {
    id: "journal",
    title: { ru: "Журнал и якоря", en: "Journal & Anchors" },
    description: {
      ru: "Записывайте мысли голосом или текстом. Якоря помогут в трудные моменты — STOP, музыка, фото.",
      en: "Record thoughts by voice or text. Anchors help in tough moments — STOP, music, photos.",
    },
    icon: <Mic className="h-8 w-8 text-primary" />,
  },
  {
    id: "settings",
    title: { ru: "Настройки", en: "Settings" },
    description: {
      ru: "Настройте тему, язык и союзника. Экспортируйте данные для резервной копии.",
      en: "Customize theme, language and ally. Export data for backup.",
    },
    icon: <Settings className="h-8 w-8 text-primary" />,
    target: "settings",
  },
  {
    id: "demo",
    title: { ru: "Демо-режим", en: "Demo Mode" },
    description: {
      ru: "В настройках можно включить демо-режим с примерами данных, чтобы изучить все функции. Ваши реальные данные останутся без изменений.",
      en: "In settings you can enable demo mode with sample data to explore all features. Your real data will remain unchanged.",
    },
    icon: <Settings className="h-8 w-8 text-purple-500" />,
    target: "settings",
  },
  {
    id: "ready",
    title: { ru: "Готовы начать!", en: "Ready to Start!" },
    description: {
      ru: "21 день — срок формирования привычки. Начните с одной приоритетной привычки и растите!",
      en: "21 days is the habit formation period. Start with one priority habit and grow!",
    },
    icon: <CheckCircle2 className="h-8 w-8 text-green-500" />,
  },
];

interface InteractiveTutorialProps {
  locale: Locale;
  onComplete: () => void;
  onSkip: () => void;
}

export function InteractiveTutorial({ locale, onComplete, onSkip }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const step = tutorialSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorialSteps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <CardContent className="p-6">
          {/* Progress bar */}
          <div className="mb-6 flex gap-1">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  index <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="relative min-h-[280px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col items-center text-center"
              >
                {/* Icon */}
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  {step.icon}
                </div>

                {/* Title */}
                <h2 className="mb-3 text-xl font-semibold">
                  {step.title[locale]}
                </h2>

                {/* Description */}
                <p className="mb-4 text-muted-foreground leading-relaxed">
                  {step.description[locale]}
                </p>

                {/* Target indicator */}
                {step.target && (
                  <div className="mt-auto flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                    {step.target === "home" && <Home size={14} />}
                    {step.target === "progress" && <LineChart size={14} />}
                    {step.target === "practice" && <Sparkles size={14} />}
                    {step.target === "add" && <Plus size={14} />}
                    {step.target === "settings" && <Settings size={14} />}
                    <span>
                      {step.target === "home" && (locale === "ru" ? "Главная" : "Home")}
                      {step.target === "progress" && (locale === "ru" ? "Прогресс" : "Progress")}
                      {step.target === "practice" && (locale === "ru" ? "Практика" : "Practice")}
                      {step.target === "add" && (locale === "ru" ? "Добавление" : "Add")}
                      {step.target === "settings" && (locale === "ru" ? "Настройки" : "Settings")}
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              {locale === "ru" ? "Пропустить" : "Skip"}
            </Button>

            <div className="flex gap-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  aria-label={locale === "ru" ? "Назад" : "Back"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Button>
              )}
              <Button onClick={handleNext} className="gap-2">
                {isLast ? (
                  <>
                    <CheckCircle2 size={16} />
                    {locale === "ru" ? "Начать" : "Start"}
                  </>
                ) : (
                  <>
                    {locale === "ru" ? "Далее" : "Next"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step counter */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {currentStep + 1} / {tutorialSteps.length}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
