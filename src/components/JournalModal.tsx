"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JournalEntry, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import AudioAnchor from "@/components/AudioAnchor";
import EmotionSelector from "@/components/EmotionSelector";
import { vibrationFeedback, triggerVibration } from "@/utils/vibrationUtils";

interface JournalModalProps {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onSubmit: (entry: JournalEntry) => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));

  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return isVisible;
};

const JournalModal = ({ open, locale, onClose, onSubmit }: JournalModalProps) => {
  const isPageVisible = usePageVisibility();
  const [content, setContent] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [spectrumData, setSpectrumData] = useState<number[]>(new Array(32).fill(4));
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingRef = useRef(false);
  const maxChars = 1000;

  const stopRecording = useCallback(() => {
    const activeRecorder = recorderRef.current;
    if (activeRecorder && activeRecorder.state !== "inactive") {
      activeRecorder.stop();
    }
    activeRecorder?.stream?.getTracks().forEach((track) => track.stop());
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    recordingRef.current = false;

    setRecorder(null);
    setRecording(false);
    setRecordingDuration(0);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    const activeAudioContext = audioContextRef.current;
    if (activeAudioContext && activeAudioContext.state !== "closed") {
      activeAudioContext.close();
    }
    audioContextRef.current = null;
    setAudioContext(null);
    setAnalyser(null);
    setSpectrumData(new Array(20).fill(8));
  }, []);

  const handleClose = useCallback(() => {
    stopRecording();
    onClose();
  }, [onClose, stopRecording]);

  useEffect(() => {
    if (!open) {
      stopRecording();
      return;
    }
    setContent("");
    setEmotions([]);
    setAudioUrl(null);
    setRecording(false);
    setRecorder(null);
  }, [open, stopRecording]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    const shouldStop = () => Boolean(recordingRef.current || recorderRef.current || streamRef.current);
    const handleVisibility = () => {
      if (document.hidden && shouldStop()) stopRecording();
    };
    const handleStop = () => {
      if (shouldStop()) stopRecording();
    };
    window.addEventListener("beforeunload", handleStop);
    window.addEventListener("pagehide", handleStop);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", handleStop);
      window.removeEventListener("pagehide", handleStop);
      document.removeEventListener("visibilitychange", handleVisibility);
      stopRecording();
    };
  }, [stopRecording]);

  useEffect(() => {
    if (!recording || recorder) return;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        // Setup Web Audio API for visualization
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 512;
        analyserNode.smoothingTimeConstant = 0.7;
        source.connect(analyserNode);
        
        audioContextRef.current = audioCtx;
        setAudioContext(audioCtx);
        setAnalyser(analyserNode);

        // Setup MediaRecorder
        const mediaRecorder = new MediaRecorder(stream);
        recorderRef.current = mediaRecorder;
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              setAudioUrl(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        };
        mediaRecorder.start();
        setRecorder(mediaRecorder);
        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      })
      .catch(() => {
        setRecording(false);
      });
  }, [recording, recorder]);

  useEffect(() => {
    if (!analyser || !recording || !isPageVisible) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const updateSpectrum = () => {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Create 32 bars from the frequency data - use more of the spectrum
      const bars = new Array(32);
      const usableBins = Math.min(bufferLength, 128); // Use lower frequencies (0-4kHz typically)
      const step = Math.floor(usableBins / 32);
      
      for (let i = 0; i < 32; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          const index = i * step + j;
          if (index < bufferLength) {
            sum += dataArray[index];
          }
        }
        const average = sum / step;
        // Exponential scaling for better sensitivity to quiet sounds
        // Map to height between 4px and 48px with exponential curve
        const normalized = average / 255;
        const exponential = Math.pow(normalized, 0.6); // Less than 1 = more sensitive to low values
        bars[i] = 4 + exponential * 44;
      }
      
      setSpectrumData(bars);
      animationRef.current = requestAnimationFrame(updateSpectrum);
    };

    updateSpectrum();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPageVisible, recording]);

  const canSubmit = (audioUrl || content.trim().length > 0) && content.length <= maxChars;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? handleClose() : null)}>
      <DialogContent className="max-w-[520px] gap-4 max-h-[70svh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("newEntryTitle", locale)}</DialogTitle>
          <DialogDescription className="sr-only">{t("dialogDetails", locale)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 overflow-y-auto pr-1" style={{ maxHeight: "calc(70svh - 160px)" }}>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">{t("chooseEmotions", locale)}</p>
            <div className="mt-2">
              <EmotionSelector
                locale={locale}
                selected={emotions}
                onToggle={(id) =>
                  setEmotions((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
                }
              />
            </div>
          </Card>
          <div className="grid gap-2">
            <div className="relative">
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={t("sharePlaceholder", locale)}
                disabled={recording}
              />
              <span className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                {content.length}/{maxChars}
              </span>
            </div>
          </div>
          <Card className="p-3">
            <div className="flex items-center justify-between gap-3">
              <Button
                size="xs"
                variant={recording ? "destructive" : "outline"}
                type="button"
                onClick={() => {
                  if (recording) {
                    triggerVibration("important");
                    stopRecording();
                    return;
                  }
                  if (audioUrl) setAudioUrl(null);
                  recordingRef.current = true;
                  setRecording(true);
                }}
              >
                {recording ? <Square size={12} /> : <Mic size={12} />}
                {recording ? t("stopRecording", locale) : t("recordAudio", locale)}
              </Button>
              {recording && (
                <div className="flex-1 flex items-center justify-center gap-[3px] h-6 px-2">
                  {[0.3, 0.5, 0.7, 0.4, 0.9, 0.6, 0.8, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.7, 0.4].map((peak, i) => {
                    const h = 4 + (spectrumData[i % spectrumData.length] / 48) * 20 * peak;
                    return (
                      <div
                        key={i}
                        className="w-[3px] bg-red-500 rounded-full"
                        style={{ height: `${Math.max(4, Math.min(20, h))}px` }}
                      />
                    );
                  })}
                </div>
              )}
              {recording && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDuration(recordingDuration)}
                </span>
              )}
            </div>
            {recording && <p className="text-xs text-muted-foreground">{t("recording", locale)}</p>}
            {audioUrl && <AudioAnchor src={audioUrl} locale={locale} />}
          </Card>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} type="button">
            {t("cancel", locale)}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                id: `journal-${Date.now()}`,
                date: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
                type: audioUrl ? "audio" : "text",
                encryptedContent: "",
                content: audioUrl ?? content.trim(),
                textContent: audioUrl ? content.trim() || undefined : undefined,
                emotions,
              })
            }
          >
            {t("save", locale)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JournalModal;
