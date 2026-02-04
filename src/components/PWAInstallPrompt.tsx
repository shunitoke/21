"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

// PWA Button SVG component matching RuStore style
function PwaButtonSvg({ isDark }: { isDark: boolean }) {
  const bgColor = isDark ? "#1A1C20" : "white";
  const strokeColor = isDark ? "#393E45" : "#EBEDF0";
  const textColor = isDark ? "white" : "#222222";
  
  return (
    <svg width="111" height="40" viewBox="0 0 111 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto">
      <g clipPath="url(#clipPwa)">
        <rect x="0.5" y="0.5" width="110" height="39" rx="3.5" fill={bgColor} stroke={strokeColor}/>
        {/* Phone icon */}
        <path d="M16 12C14.9 12 14 12.9 14 14V26C14 27.1 14.9 28 16 28H24C25.1 28 26 27.1 26 26V14C26 12.9 25.1 12 24 12H16ZM20 27C19.45 27 19 26.55 19 26C19 25.45 19.45 25 20 25C20.55 25 21 25.45 21 26C21 26.55 20.55 27 20 27ZM24 24H16V14H24V24Z" fill={textColor}/>
        {/* PWA text */}
        <text x="36" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontSize="13" fontWeight="500" fill={textColor}>PWA</text>
      </g>
      <defs>
        <clipPath id="clipPwa">
          <rect width="111" height="40" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}

function useIsDarkTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const root = document.documentElement;
      const theme = root.dataset.theme;
      if (theme) {
        setIsDark(theme === "dark");
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDark(prefersDark);
      }
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const isDark = useIsDarkTheme();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem("program21.installPromptDismissed");
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleInstallRustore = () => {
    window.location.href = "https://rustore.ru/catalog/app/com.programma21.app";
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("program21.installPromptDismissed", new Date().toISOString());
  };

  if (!isVisible || isInstalled) return null;

  const rustoreButtonSrc = isDark ? "/logo-color-light.svg" : "/logo-color-dark.svg";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[270px]">
      <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-md p-3 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm">Установить Program 21</h3>
          <Button size="icon" variant="ghost" className="h-5 w-5 -mr-1 -mt-1 shrink-0" onClick={handleDismiss}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-tight">
          Версия из RuStore — полная с офлайн-режимом.
        </p>
        <div className="flex gap-2 mt-2.5">
          <button
            onClick={handleInstallRustore}
            className="flex-1 h-[36px] hover:opacity-90 transition-opacity"
            type="button"
          >
            <img 
              src={rustoreButtonSrc} 
              alt="Скачать из RuStore"
              className="h-full w-full object-contain rounded-md"
            />
          </button>
          <button
            onClick={handleInstallPWA}
            className="flex-1 h-[36px] hover:opacity-90 transition-opacity"
            type="button"
          >
            <PwaButtonSvg isDark={isDark} />
          </button>
        </div>
      </div>
    </div>
  );
}
