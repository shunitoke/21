"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AudioAnchorProps {
  src: string;
  locale: Locale;
}

const AudioAnchor = ({ src, locale }: AudioAnchorProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setError(t("buffering", locale));
      setIsPlaying(false);
      // Auto-retry after 3 seconds if it was playing
      if (wasPlayingRef.current) {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          audio.load();
          audio.play().then(() => {
            setIsPlaying(true);
            setError(null);
          }).catch(() => {
            setError(t("stopped", locale));
          });
        }, 3000);
      }
    };
    const handleWaiting = () => {
      setError(t("buffering", locale));
    };
    const handlePlaying = () => {
      setError(null);
      wasPlayingRef.current = true;
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [locale]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    // Always reload if src changed
    if (!isLoaded || audio.src !== src) {
      audio.src = src;
      audio.load();
      setIsLoaded(true);
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      wasPlayingRef.current = false;
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          wasPlayingRef.current = true;
          setError(null);
        })
        .catch(() => {
          setIsPlaying(false);
          setError(t("stopped", locale));
        });
    }
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardContent className="grid gap-2">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={togglePlay}
            aria-label={isPlaying ? t("stopped", locale) : t("playing", locale)}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          <div className="grid gap-1 min-w-0">
            <span className="text-xs font-semibold truncate">{t("audio", locale)}</span>
            <span className="text-sm text-muted-foreground truncate">
              {error || `${formatTime(currentTime)} / ${formatTime(duration)}`}
            </span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 1}
          step={0.1}
          value={Math.min(currentTime, duration > 0 ? duration : 0)}
          disabled={duration <= 0}
          className="w-full"
          style={{ accentColor: "var(--color-ring)" }}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!audioRef.current) return;
            audioRef.current.currentTime = value;
            setCurrentTime(value);
          }}
        />
        <audio ref={audioRef} preload="metadata" />
      </CardContent>
    </Card>
  );
};

export default AudioAnchor;
