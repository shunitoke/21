"use client";

import { useEffect, useRef, useCallback } from "react";
import { App } from "@capacitor/app";

interface UseBackButtonProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  canExit: boolean;
  onExit: () => void;
  exitMessage: string;
  onShowToast: (message: string) => void;
}

export function useBackButton({
  isModalOpen,
  onCloseModal,
  isSettingsOpen,
  onCloseSettings,
  canExit,
  onExit,
  exitMessage,
  onShowToast,
}: UseBackButtonProps) {
  const lastBackPressRef = useRef<number>(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleBackButton = useCallback(() => {
    // Priority 0: Check for any open dialogs/modals in DOM (from any screen)
    const openDialog = document.querySelector('[data-state="open"][data-slot="dialog-content"], [data-state="open"][data-slot="alert-dialog-content"]');
    const openOverlay = document.querySelector('[data-state="open"][data-slot="dialog-overlay"], [data-state="open"][data-slot="alert-dialog-overlay"]');
    if (openDialog || openOverlay) {
      // Find the close button or trigger close
      const closeButton = document.querySelector('[data-state="open"] button[data-slot="dialog-close"], [data-state="open"] [data-slot="dialog-close"]');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      } else {
        // Try to dispatch escape key to close modal
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27 }));
      }
      return;
    }

    // Priority 1: Close modals first (legacy check for habit modal)
    if (isModalOpen) {
      onCloseModal();
      return;
    }

    // Priority 2: Close settings
    if (isSettingsOpen) {
      onCloseSettings();
      return;
    }

    // Priority 3: Exit confirmation
    if (canExit) {
      const now = Date.now();
      const lastPress = lastBackPressRef.current;
      
      if (now - lastPress < 2000) {
        // Second press within 2 seconds - exit app
        onExit();
      } else {
        // First press - show toast
        lastBackPressRef.current = now;
        onShowToast(exitMessage);
        
        // Clear toast after 2 seconds
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          onShowToast("");
        }, 2000);
      }
    }
  }, [
    isModalOpen,
    onCloseModal,
    isSettingsOpen,
    onCloseSettings,
    canExit,
    onExit,
    exitMessage,
    onShowToast,
  ]);

  useEffect(() => {
    const isNative = typeof window !== "undefined" && typeof (window as any).Capacitor !== "undefined";
    if (!isNative) return;

    // Use Capacitor App plugin back button listener
    const listener = App.addListener("backButton", handleBackButton);

    return () => {
      listener.then((l) => l.remove());
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [handleBackButton]);
}
