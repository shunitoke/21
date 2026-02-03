"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RadioAnchorProps {
  src: string;
  locale: Locale;
}

const RadioAnchor = ({ src, locale }: RadioAnchorProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    const handleError = () => {
      setError(t("buffering", locale));
      setIsPlaying(false);
      setIsBuffering(false);
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
      setIsBuffering(true);
      setError(t("buffering", locale));
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setError(null);
      wasPlayingRef.current = true;
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("canplay", handleCanPlay);

    audio.src = src;
    audio.preload = "metadata";
    audio.load();

    return () => {
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("canplay", handleCanPlay);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [src, locale]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsBuffering(false);
      wasPlayingRef.current = false;
      return;
    }

    setIsBuffering(true);
    setError(null);
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
        wasPlayingRef.current = true;
      })
      .catch(() => {
        setIsPlaying(false);
        setIsBuffering(false);
        setError(t("stopped", locale));
      });
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
            <span className="text-xs font-semibold truncate">{t("radio", locale)}</span>
            <span className="text-sm text-muted-foreground truncate">
              {error || (isBuffering ? t("buffering", locale) : isPlaying ? t("playing", locale) : t("stopped", locale))}
            </span>
          </div>
        </div>
        <audio ref={audioRef} />
      </CardContent>
    </Card>
  );
};

export default RadioAnchor;
