"use client";

import { useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

export function useStatusBar(isDark: boolean) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const updateStatusBar = async () => {
      try {
        // Set status bar background to match app background
        const bgColor = isDark ? "#0a0b0f" : "#ffffff";
        await StatusBar.setBackgroundColor({ color: bgColor });

        // Set status bar style based on theme
        // Light = dark icons/text on light background
        // Dark = light icons/text on dark background
        const style = isDark ? Style.Dark : Style.Light;
        await StatusBar.setStyle({ style });
      } catch (err) {
        console.warn("StatusBar error:", err);
      }
    };

    updateStatusBar();
  }, [isDark]);
}
