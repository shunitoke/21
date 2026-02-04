"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play, Music } from "lucide-react";
import type { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AudioAnchorProps {
  src: string;
  locale: Locale;
}

export function AudioAnchor({ src, locale }: AudioAnchorProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const durationPollRef = useRef<NodeJS.Timeout | null>(null);

  // Clear duration poll on unmount
  useEffect(() => {
    return () => {
      if (durationPollRef.current) {
        clearInterval(durationPollRef.current);
      }
    };
  }, []);

  // Initialize audio when src changes
  useEffect(() => {
    if (!src) return;

    // Create new audio element
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = src;
    audioRef.current = audio;

    // Reset states
    setDuration(0);
    setCurrentTime(0);
    setError(null);
    setIsPlaying(false);
    setIsLoading(false);

    // Load metadata - try multiple approaches for data URLs
    const loadMetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    // Check if already loaded (cached)
    if (audio.readyState >= 1) {
      loadMetadata();
    }

    // Also try after a small delay for data URLs that don't fire events properly
    const timeoutId = setTimeout(() => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    }, 100);

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    const onError = () => {
      setError(t("playbackError", locale));
      setIsPlaying(false);
      setIsLoading(false);
    };
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", loadMetadata);
    audio.addEventListener("durationchange", loadMetadata);
    audio.addEventListener("canplay", loadMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);

    // Force load for data URLs
    audio.load();

    return () => {
      clearTimeout(timeoutId);
      audio.pause();
      audio.src = "";
      audio.removeEventListener("loadedmetadata", loadMetadata);
      audio.removeEventListener("durationchange", loadMetadata);
      audio.removeEventListener("canplay", loadMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
    };
  }, [src, locale]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      // Stop polling for duration
      if (durationPollRef.current) {
        clearInterval(durationPollRef.current);
        durationPollRef.current = null;
      }
    } else {
      setIsLoading(true);
      try {
        await audio.play();
        setIsPlaying(true);
        setError(null);
        // Start polling for duration if not yet available (for data URLs)
        if (!duration || duration <= 0) {
          durationPollRef.current = setInterval(() => {
            if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
              setDuration(audio.duration);
              clearInterval(durationPollRef.current!);
              durationPollRef.current = null;
            }
          }, 200);
        }
      } catch {
        setError(t("playbackError", locale));
        setIsPlaying(false);
      }
      setIsLoading(false);
    }
  }, [isPlaying, duration, locale]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const value = Number(e.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  }, []);

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

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
            {isLoading ? (
              <Music size={14} className="animate-pulse" />
            ) : isPlaying ? (
              <Pause size={14} />
            ) : (
              <Play size={14} />
            )}
          </Button>
          <div className="grid gap-0.5 min-w-0">
            <span className="text-xs font-semibold truncate">{t("audio", locale)}</span>
            <span className={`text-sm truncate ${error ? "text-destructive" : "text-muted-foreground"}`}>
              {error || `${formatTime(currentTime)} / ${formatTime(duration)}`}
            </span>
          </div>
        </div>
        
        {/* Progress slider */}
        <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute h-full bg-primary transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={Math.min(currentTime, duration || 100)}
            onChange={handleSeek}
            disabled={isLoading}
            className="absolute inset-0 w-full h-full opacity-0"
            style={{ cursor: duration > 0 ? "pointer" : "default" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default AudioAnchor;
