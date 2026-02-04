"use client";

import { useEffect, useState } from "react";

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      // Plugin injects these CSS variables automatically
      const top = parseInt(computedStyle.getPropertyValue("--safe-area-inset-top") || "0", 10);
      const bottom = parseInt(computedStyle.getPropertyValue("--safe-area-inset-bottom") || "0", 10);
      const left = parseInt(computedStyle.getPropertyValue("--safe-area-inset-left") || "0", 10);
      const right = parseInt(computedStyle.getPropertyValue("--safe-area-inset-right") || "0", 10);
      setInsets({ top, bottom, left, right });
    };

    // Initial update with small delay to let plugin inject variables
    const timeoutId = setTimeout(updateInsets, 100);

    // Listen for resize events
    window.addEventListener("resize", updateInsets);
    window.addEventListener("orientationchange", updateInsets);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateInsets);
      window.removeEventListener("orientationchange", updateInsets);
    };
  }, []);

  return insets;
}
