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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (!isLoaded) {
      audio.src = src;
      audio.load();
      setIsLoaded(true);
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardContent className="grid gap-2">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={togglePlay}
            aria-label={isPlaying ? t("stopped", locale) : t("playing", locale)}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          <div className="grid gap-1">
            <span className="text-xs font-semibold">{t("audio", locale)}</span>
            <span className="text-sm text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            className="w-28"
            style={{ accentColor: "var(--color-ring)" }}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!audioRef.current) return;
              audioRef.current.currentTime = value;
              setCurrentTime(value);
            }}
          />
        </div>
        <audio ref={audioRef} preload="none" />
      </CardContent>
    </Card>
  );
};

export default AudioAnchor;
