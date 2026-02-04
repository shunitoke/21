"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play, Radio } from "lucide-react";
import type { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RadioAnchorProps {
  src: string;
  locale: Locale;
}

type PlayerState = "idle" | "loading" | "playing" | "buffering" | "error";

export function RadioAnchor({ src, locale }: RadioAnchorProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingRef = useRef(false);
  const isOnlineRef = useRef(true);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const getRetryDelay = () => {
    const baseDelay = 1000;
    const maxDelay = 30000;
    return Math.min(baseDelay * Math.pow(2, retryCountRef.current), maxDelay);
  };

  const handlePlayError = useCallback(() => {
    if (retryCountRef.current < maxRetries && isOnlineRef.current) {
      retryCountRef.current++;
      const delay = getRetryDelay();
      
      setPlayerState("buffering");
      setErrorMessage(`${t("reconnecting", locale)} (${retryCountRef.current})`);
      
      retryTimeoutRef.current = setTimeout(() => {
        const audio = audioRef.current;
        if (audio && wasPlayingRef.current) {
          audio.load();
          audio.play().catch(() => handlePlayError());
        }
      }, delay);
    } else {
      setPlayerState("error");
      setErrorMessage(t("connectionFailed", locale));
      wasPlayingRef.current = false;
    }
  }, [locale]);

  const attemptPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    try {
      setPlayerState("loading");
      setErrorMessage(null);
      retryCountRef.current = 0;
      
      await audio.play();
      wasPlayingRef.current = true;
      setPlayerState("playing");
    } catch {
      handlePlayError();
    }
  }, [src, handlePlayError]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    cleanup();

    if (playerState === "playing") {
      audio.pause();
      wasPlayingRef.current = false;
      setPlayerState("idle");
      setErrorMessage(null);
    } else {
      if (audio.error || audio.src !== src) {
        audio.src = src;
        audio.load();
      }
      attemptPlay();
    }
  }, [playerState, src, attemptPlay, cleanup]);

  // Network monitoring
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      if (wasPlayingRef.current && audioRef.current?.paused) {
        setTimeout(() => attemptPlay(), 1000);
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setErrorMessage(t("noConnection", locale));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [attemptPlay, locale]);

  // Audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    const handlePlaying = () => {
      setPlayerState("playing");
      setErrorMessage(null);
      retryCountRef.current = 0;
    };

    const handleWaiting = () => {
      setPlayerState("buffering");
      setErrorMessage(t("buffering", locale));
    };

    const handleStalled = () => {
      if (wasPlayingRef.current && isOnlineRef.current) {
        handlePlayError();
      }
    };

    const handleError = () => {
      const error = audio.error;
      if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        setErrorMessage(t("streamNotAvailable", locale));
        wasPlayingRef.current = false;
        setPlayerState("error");
        return;
      }
      handlePlayError();
    };

    const handleEnded = () => {
      if (wasPlayingRef.current) handlePlayError();
    };

    audio.crossOrigin = "anonymous";
    audio.preload = "none";
    audio.src = src;

    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("stalled", handleStalled);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);

    return () => {
      cleanup();
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("stalled", handleStalled);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, [src, handlePlayError, cleanup, locale]);

  const getStatusText = () => {
    if (errorMessage) return errorMessage;
    switch (playerState) {
      case "playing": return t("playing", locale);
      case "buffering": return t("buffering", locale);
      case "loading": return t("connecting", locale);
      default: return t("stopped", locale);
    }
  };

  const isPlaying = playerState === "playing";
  const isLoading = playerState === "loading" || playerState === "buffering";

  return (
    <Card>
      <CardContent className="grid gap-2 p-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={togglePlay}
            disabled={isLoading}
            aria-label={isPlaying ? t("pause", locale) : t("play", locale)}
          >
            {isPlaying ? <Pause size={14} /> : isLoading ? <Radio size={14} className="animate-pulse" /> : <Play size={14} />}
          </Button>
          <div className="grid gap-0.5 min-w-0">
            <span className="text-xs font-semibold truncate">{t("radio", locale)}</span>
            <span className={`text-sm truncate ${playerState === "error" ? "text-destructive" : playerState === "buffering" ? "text-muted-foreground animate-pulse" : "text-muted-foreground"}`}>
              {getStatusText()}
            </span>
          </div>
        </div>
        <audio ref={audioRef} />
      </CardContent>
    </Card>
  );
}

export default RadioAnchor;
