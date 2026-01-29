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

interface JournalModalProps {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onSubmit: (entry: JournalEntry) => void;
}

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
  const [spectrumData, setSpectrumData] = useState<number[]>(new Array(20).fill(8));
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
        analyserNode.fftSize = 256;
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

      // Create 20 bars from the frequency data
      const bars = new Array(20);
      const step = Math.floor(bufferLength / 20);
      
      for (let i = 0; i < 20; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        const average = sum / step;
        // Map to height between 4px and 32px
        bars[i] = 4 + (average / 255) * 28;
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
      <DialogContent className="max-w-[520px] gap-4">
        <DialogHeader>
          <DialogTitle>{t("newEntryTitle", locale)}</DialogTitle>
          <DialogDescription className="sr-only">{t("dialogDetails", locale)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
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
            <div className={`flex items-center gap-3 ${recording ? '' : 'flex-row-reverse'}`}>
              {recording && (
                <div className="flex-1 flex items-center gap-1">
                  {spectrumData.map((height, i) => (
                    <div
                      key={i}
                      className="bg-blue-500 rounded-full transition-all duration-75"
                      style={{
                        width: `${100 / 20 - 1}%`,
                        height: `${height}px`,
                        minHeight: '4px',
                      }}
                    />
                  ))}
                </div>
              )}
              <Button
                size="xs"
                variant={recording ? "destructive" : "outline"}
                type="button"
                onClick={() => {
                  if (recording) {
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
