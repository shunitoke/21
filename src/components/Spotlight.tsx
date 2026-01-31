"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface SpotlightProps {
  targetSelector: string;
  isActive: boolean;
  title?: string;
  description?: string;
  locale?: "ru" | "en";
  onNext?: () => void;
  onSkip?: () => void;
  stepNumber?: number;
  totalSteps?: number;
}

export function Spotlight({
  targetSelector,
  isActive,
  title,
  description,
  locale = "ru",
  onNext,
  onSkip,
  stepNumber,
  totalSteps,
}: SpotlightProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    // Re-check after a short delay to handle animations
    const timeout = setTimeout(updateRect, 100);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      clearTimeout(timeout);
    };
  }, [targetSelector, isActive]);

  if (!mounted || !isActive || !targetRect) return null;

  const padding = 8;
  const highlightStyle = {
    position: "fixed" as const,
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    borderRadius: 12,
    pointerEvents: "none" as const,
    zIndex: 9998,
    boxShadow: `
      0 0 0 9999px rgba(0, 0, 0, 0.7),
      0 0 0 4px hsl(var(--primary)),
      0 0 20px 4px hsl(var(--primary) / 0.5)
    `,
  };

  // Calculate tooltip position
  const tooltipWidth = 280;
  let tooltipLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  let tooltipTop = targetRect.bottom + 16;

  // Keep tooltip within viewport
  if (tooltipLeft < 16) tooltipLeft = 16;
  if (tooltipLeft + tooltipWidth > window.innerWidth - 16) {
    tooltipLeft = window.innerWidth - tooltipWidth - 16;
  }
  if (tooltipTop + 200 > window.innerHeight) {
    tooltipTop = targetRect.top - 200;
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Highlight overlay */}
        <div style={highlightStyle} />

        {/* Pulsing ring animation */}
        <motion.div
          className="fixed pointer-events-none"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            borderRadius: 12,
            zIndex: 9997,
          }}
          animate={{
            boxShadow: [
              "0 0 0 0px hsl(var(--primary) / 0.5)",
              "0 0 0 8px hsl(var(--primary) / 0)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />

        {/* Tooltip */}
        {(title || description) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="fixed z-[9999] w-[280px] bg-background border rounded-xl shadow-2xl p-4"
            style={{
              left: tooltipLeft,
              top: tooltipTop,
            }}
          >
            {title && (
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}

            {/* Step counter and buttons */}
            <div className="mt-4 flex items-center justify-between">
              {stepNumber && totalSteps && (
                <span className="text-xs text-muted-foreground">
                  {stepNumber} / {totalSteps}
                </span>
              )}
              <div className="flex gap-2 ml-auto">
                {onSkip && (
                  <button
                    onClick={onSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {locale === "ru" ? "Пропустить" : "Skip"}
                  </button>
                )}
                {onNext && (
                  <button
                    onClick={onNext}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    {locale === "ru" ? "Далее" : "Next"}
                  </button>
                )}
              </div>
            </div>

            {/* Arrow pointing to target */}
            <div
              className="absolute w-3 h-3 bg-background border-l border-t rotate-45 -top-1.5 left-1/2 -translate-x-1/2"
              style={{
                display:
                  tooltipTop > targetRect.top ? "block" : "none",
              }}
            />
            <div
              className="absolute w-3 h-3 bg-background border-r border-b rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"
              style={{
                display:
                  tooltipTop < targetRect.top ? "block" : "none",
              }}
            />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// Hook for managing spotlight tour
interface SpotlightStep {
  targetSelector: string;
  title: string;
  description: string;
}

export function useSpotlightTour(steps: SpotlightStep[], onComplete?: () => void) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const start = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const stop = () => {
    setIsActive(false);
  };

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsActive(false);
      onComplete?.();
    }
  };

  const skip = () => {
    setIsActive(false);
    onComplete?.();
  };

  return {
    isActive,
    currentStep,
    currentStepData: steps[currentStep],
    start,
    stop,
    next,
    skip,
  };
}
