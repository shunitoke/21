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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.src = src;
    audio.load();
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    setIsBuffering(true);
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      })
      .catch(() => {
        setIsPlaying(false);
        setIsBuffering(false);
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
              {isBuffering ? t("buffering", locale) : isPlaying ? t("playing", locale) : t("stopped", locale)}
            </span>
          </div>
        </div>
        <audio ref={audioRef} preload="none" />
      </CardContent>
    </Card>
  );
};

export default RadioAnchor;
