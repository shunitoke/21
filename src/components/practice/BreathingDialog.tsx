"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { triggerVibration } from "@/utils/vibrationUtils";
import type { Locale } from "@/lib/types";

const breathingPhases = ["inhale", "hold", "exhale"] as const;
type BreathingPhase = (typeof breathingPhases)[number];

const phaseLabels: Record<BreathingPhase, { ru: string; en: string }> = {
  inhale: { ru: "Вдох", en: "Inhale" },
  hold: { ru: "Задержка", en: "Hold" },
  exhale: { ru: "Выдох", en: "Exhale" },
};

const phaseDescriptions: Record<BreathingPhase, { ru: string; en: string }> = {
  inhale: { ru: "Медленно наполняйте лёгкие", en: "Slowly fill the lungs" },
  hold: { ru: "Сохраняйте паузу ровно", en: "Hold the pause steadily" },
  exhale: { ru: "Мягко выпускайте воздух", en: "Gently release the air" },
};

const breathingDots = Array.from({ length: 6 }, (_, index) => index);

interface BreathingDialogProps {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  isPageVisible?: boolean;
}

export function BreathingDialog({ open, locale, onClose, isPageVisible = true }: BreathingDialogProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  const phase = breathingPhases[phaseIndex];
  const cycleBrightness = 0.6 + (cycle % 4) * 0.12;
  const isDark = darkMode;

  useEffect(() => {
    if (!open || !isPageVisible) return;
    setPhaseIndex(0);
    setCycle(1);
    setElapsed(0);
    const timer = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, isPageVisible]);

  useEffect(() => {
    if (!open || !isPageVisible) return;
    const nextPhaseIndex = Math.floor(elapsed / 4) % breathingPhases.length;
    const nextCycle = Math.floor(elapsed / (4 * breathingPhases.length)) + 1;
    setPhaseIndex(nextPhaseIndex);
    setCycle(nextCycle);
  }, [elapsed, open, isPageVisible]);

  useEffect(() => {
    if (!open || !isPageVisible) return;
    triggerVibration("light");
  }, [open, phase, isPageVisible]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        className={`h-[100svh] w-screen max-w-none overflow-hidden rounded-none border-none p-0 ${
          isDark ? "bg-[#0f1217] text-[#f3f2ee]" : "bg-[#f6f5f3] text-[#0e1220]"
        }`}
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{locale === "ru" ? "Дыхание" : "Breathing"}</DialogTitle>
          <DialogDescription>Breathing exercise</DialogDescription>
        </DialogHeader>
        <div className="relative flex h-full w-full flex-col px-6 py-10 sm:px-12">
          <div className="pointer-events-none absolute inset-0">
            <div
              className={`absolute inset-0 ${
                isDark
                  ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_60%)]"
                  : "bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.05),_transparent_60%)]"
              }`}
            />
            <div
              className={`absolute inset-0 ${
                isDark
                  ? "bg-[linear-gradient(180deg,_rgba(15,18,23,0.9)_0%,_rgba(15,18,23,0.85)_40%,_rgba(15,18,23,1)_100%)]"
                  : "bg-[linear-gradient(180deg,_rgba(255,255,255,0.8)_0%,_rgba(246,245,243,0.95)_40%,_rgba(246,245,243,1)_100%)]"
              }`}
            />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.5em] opacity-60">
                {locale === "ru" ? "Дыхание" : "Breathing"}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[0.08em]">
                {locale === "ru" ? phaseLabels[phase].ru : phaseLabels[phase].en}
              </p>
              <p className={`mt-2 text-sm ${isDark ? "text-[#b8b4af]" : "text-[#7b7f86]"}`}>
                {locale === "ru" ? "Вдох • Задержка • Выдох" : "Inhale • Hold • Exhale"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] opacity-60">
                {isDark ? <Moon size={14} /> : <Sun size={14} />}
                <Switch
                  checked={isDark}
                  onCheckedChange={setDarkMode}
                  className={isDark ? undefined : "data-[state=unchecked]:bg-black/20 data-[state=checked]:bg-black/70"}
                  aria-label={locale === "ru" ? "Тема экрана" : "Screen theme"}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-full border ${
                  isDark
                    ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    : "border-black/10 bg-white/70 text-black/70 hover:bg-white"
                }`}
                onClick={onClose}
                aria-label={locale === "ru" ? "Закрыть" : "Close"}
              >
                <X size={18} />
              </Button>
            </div>
          </div>
          <div className="relative z-0 flex flex-1 flex-col items-center justify-center">
            <motion.div
              className="relative grid place-items-center transform-gpu"
              style={{ willChange: "transform", contain: "layout style" }}
              animate={{
                scale: phase === "inhale" ? 1.18 : phase === "exhale" ? 0.82 : 1.02,
              }}
              transition={{ duration: 4, ease: "easeInOut" }}
            >
              <div
                className={`absolute size-[240px] rounded-full ${isDark ? "bg-[#2f7bff]" : "bg-[#f3e7db]"}`}
                style={{ opacity: isDark ? 0.45 * cycleBrightness : 1 }}
              />
              {breathingDots.map((index) => (
                <span
                  key={`breath-layer-${index}`}
                  className={`absolute size-[240px] rounded-full ${isDark ? "bg-[#5aa8ff]" : "bg-[#f7ede2]"}`}
                  style={{
                    opacity: (isDark ? 0.25 : 0.35) * cycleBrightness,
                    transform: `rotate(${index * 30}deg)`,
                  }}
                />
              ))}
              <div
                className={`absolute size-[180px] rounded-full ${isDark ? "bg-[#7cc6ff]" : "bg-[#f1d7c2]/70"}`}
                style={{ opacity: isDark ? 0.45 * cycleBrightness : 1 }}
              />
              <div
                className={`absolute size-[120px] rounded-full ${isDark ? "bg-[#c0e4ff]" : "bg-[#f0c8aa]/65"}`}
                style={{ opacity: isDark ? 0.5 * cycleBrightness : 1 }}
              />
            </motion.div>
          </div>
          <p className={`relative z-10 mt-auto pb-8 text-center text-sm ${isDark ? "text-[#b8b4af]" : "text-[#7b7f86]"}`}>
            {locale === "ru" ? phaseDescriptions[phase].ru : phaseDescriptions[phase].en}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
