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
import { VoiceRecorder } from "capacitor-voice-recorder";
import { Capacitor } from "@capacitor/core";

interface JournalModalProps {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onSubmit: (entry: JournalEntry) => void;
}

const getSupportedMimeType = (): string => {
  const types = ['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      console.log('[Audio] Supported MIME type:', type);
      return type;
    }
  }
  console.log('[Audio] No specific MIME type supported, using default');
  return '';
};

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
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);

  // Detect if running on native platform
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  const maxChars = 1000;

  const stopRecording = useCallback(async () => {
    // Handle native recording
    if (isNative) {
      try {
        const result = await VoiceRecorder.stopRecording();
        if (result.value && result.value.recordDataBase64) {
          // Convert base64 to data URL
          const mimeType = 'audio/aac';
          const dataUrl = `data:${mimeType};base64,${result.value.recordDataBase64}`;
          setAudioUrl(dataUrl);
        }
      } catch (e) {
        console.error('[Audio] Native stop recording error:', e);
      }
      setRecording(false);
      setRecordingDuration(0);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      return;
    }

    // Handle web recording (PWA)
    const activeRecorder = recorderRef.current;
    if (activeRecorder && activeRecorder.state !== "inactive") {
      try {
        activeRecorder.stop();
      } catch (e) {
        console.error('[Audio] Error stopping recorder:', e);
      }
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
  }, [isNative]);

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
    setRecordingError(null);
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
    setRecordingError(null);

    // Use native voice recorder on Capacitor
    if (isNative) {
      const startNativeRecording = async () => {
        try {
          // Check and request permission
          const permResult = await VoiceRecorder.hasAudioRecordingPermission();
          if (!permResult.value) {
            const requestResult = await VoiceRecorder.requestAudioRecordingPermission();
            if (!requestResult.value) {
              setRecordingError('Microphone permission denied');
              setRecording(false);
              return;
            }
          }

          // Start recording
          await VoiceRecorder.startRecording();
          console.log('[Audio] Native recording started');

          // Start duration timer
          durationIntervalRef.current = setInterval(() => {
            setRecordingDuration(prev => prev + 1);
          }, 1000);
        } catch (e) {
          console.error('[Audio] Native recording failed:', e);
          setRecordingError('Recording failed: ' + (e as Error).message);
          setRecording(false);
        }
      };
      startNativeRecording();
      return;
    }

    // Web recording (PWA) - original logic
    if (!window.MediaRecorder) {
      setRecordingError('MediaRecorder not supported in this WebView');
      setRecording(false);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;

        // Try to create MediaRecorder with various options
        let mediaRecorder: MediaRecorder;
        const mimeType = getSupportedMimeType();

        try {
          mediaRecorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
          console.log('[Audio] MediaRecorder created, mimeType:', mediaRecorder.mimeType || 'default');
        } catch (e) {
          console.error('[Audio] Failed to create MediaRecorder:', e);
          setRecordingError('Failed to create recorder: ' + (e as Error).message);
          setRecording(false);
          return;
        }
        recorderRef.current = mediaRecorder;
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (chunks.length === 0) {
            console.error('[Audio] No data recorded');
            setRecordingError('No audio data recorded');
            return;
          }
          const blobType = mediaRecorder.mimeType || 'audio/webm';
          const blob = new Blob(chunks, { type: blobType });
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              setAudioUrl(reader.result);
            }
          };
          reader.onerror = (e) => {
            console.error('[Audio] FileReader error:', e);
            setRecordingError('Failed to process audio');
          };
          reader.readAsDataURL(blob);
        };

        mediaRecorder.onerror = (e) => {
          console.error('[Audio] MediaRecorder error:', e);
          setRecordingError('Recording error: ' + (e as ErrorEvent).message);
          setRecording(false);
        };

        try {
          mediaRecorder.start(100); // Request data every 100ms for better compatibility
          console.log('[Audio] MediaRecorder started, state:', mediaRecorder.state);
          setRecorder(mediaRecorder);
        } catch (e) {
          console.error('[Audio] Failed to start MediaRecorder:', e);
          setRecordingError('Failed to start: ' + (e as Error).message);
          setRecording(false);
          return;
        }

        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      })
      .catch((err) => {
        console.error('[Audio] Recording failed:', err);
        setRecordingError('Microphone access failed: ' + err.message);
        setRecording(false);
      });
  }, [recording, recorder, isNative]);

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
                onClick={async () => {
                  if (recording) {
                    triggerVibration("important");
                    await stopRecording();
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
            {recordingError && (
              <p className="text-xs text-red-500 mt-2">{recordingError}</p>
            )}
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
