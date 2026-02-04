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
      return type;
    }
  }
  return '';
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Simulated spectrum component for native recording (no real audio data available)
const NativeSpectrum = () => {
  const [heights, setHeights] = useState<number[]>([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => {
        // Random height between 4 and 20px with some smoothing
        const target = 4 + Math.random() * 16;
        return target;
      }));
    }, 80);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <>
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[3px] bg-red-500 rounded-full transition-all duration-75"
          style={{ height: `${Math.max(4, Math.min(20, h))}px` }}
        />
      ))}
    </>
  );
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
  const isStoppingRef = useRef(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);
  const recordingResolveRef = useRef<((value: string | null) => void) | null>(null);

  // Detect if running on native platform
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  const maxChars = 1000;

  const stopRecording = useCallback(async (): Promise<string | null> => {
    isStoppingRef.current = true;
    
    // Handle native recording
    if (isNative) {
      try {
        const result = await VoiceRecorder.stopRecording();
        if (result.value && result.value.recordDataBase64) {
          const mimeType = 'audio/aac';
          const dataUrl = `data:${mimeType};base64,${result.value.recordDataBase64}`;
          setAudioUrl(dataUrl);
          setRecording(false);
          setRecordingDuration(0);
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          isStoppingRef.current = false;
          return dataUrl;
        }
      } catch (e) {
        // Silent fail
      }
      setRecording(false);
      setRecordingDuration(0);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      isStoppingRef.current = false;
      return null;
    }

    // Handle web recording (PWA)
    const activeRecorder = recorderRef.current;
    
    // If recorder is already inactive or doesn't exist, resolve with current audioUrl
    if (!activeRecorder || activeRecorder.state === "inactive") {
      setRecording(false);
      setRecordingDuration(0);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      isStoppingRef.current = false;
      return audioUrl;
    }

    // Return a promise that resolves when recording stops
    return new Promise((resolve) => {
      recordingResolveRef.current = (value) => {
        isStoppingRef.current = false;
        resolve(value);
      };
      
      // Stop the recorder - onstop handler will resolve the promise
      try {
        activeRecorder.stop();
      } catch (e) {
        // Silent fail
        isStoppingRef.current = false;
        resolve(null);
      }
    });
  }, [isNative, audioUrl]);

  // Start recording function - called directly from button
  const startRecording = useCallback(async () => {
    // Wait if currently stopping
    while (isStoppingRef.current) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Clean up any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    recordingRef.current = false;
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
    
    setRecordingError(null);
    setAudioUrl(null);
    recordingRef.current = true;
    setRecording(true);

    // Native recording
    if (isNative) {
      try {
        const permResult = await VoiceRecorder.hasAudioRecordingPermission();
        if (!permResult.value) {
          const requestResult = await VoiceRecorder.requestAudioRecordingPermission();
          if (!requestResult.value) {
            setRecordingError('Microphone permission denied');
            setRecording(false);
            return;
          }
        }
        await VoiceRecorder.startRecording();
        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } catch (e) {
        setRecordingError('Recording failed: ' + (e as Error).message);
        setRecording(false);
      }
      return;
    }

    // Web recording
    if (!window.MediaRecorder) {
      setRecordingError('MediaRecorder not supported');
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      
      recorderRef.current = mediaRecorder;

      // Audio context for visualization
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const anal = audioCtx.createAnalyser();
        anal.fftSize = 256;
        source.connect(anal);
        setAudioContext(audioCtx);
        setAnalyser(anal);
      } catch (e) {
        // Silent fail
      }

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Guard: ignore if this is not the current recorder anymore
        if (recorderRef.current !== mediaRecorder) {
          return;
        }
        if (!chunks || chunks.length === 0) {
          setRecordingError('No audio data recorded');
          if (recordingResolveRef.current) {
            recordingResolveRef.current(null);
            recordingResolveRef.current = null;
          }
          return;
        }
        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: blobType });
        const reader = new FileReader();
        reader.onloadend = () => {
          // Guard: ignore if this is not the current recorder anymore
          if (recorderRef.current !== mediaRecorder) {
            return;
          }
          if (typeof reader.result === "string") {
            setAudioUrl(reader.result);
            if (recordingResolveRef.current) {
              recordingResolveRef.current(reader.result);
              recordingResolveRef.current = null;
            }
          }
          // Cleanup
          setRecording(false);
          setRecordingDuration(0);
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          recorderRef.current = null;
          recordingRef.current = false;
          setRecorder(null);
          const activeAudioContext = audioContextRef.current;
          if (activeAudioContext && activeAudioContext.state !== "closed") {
            activeAudioContext.close();
          }
          audioContextRef.current = null;
          setAudioContext(null);
          setAnalyser(null);
          setSpectrumData(new Array(20).fill(8));
        };
        reader.onerror = () => {
          if (recordingResolveRef.current) {
            recordingResolveRef.current(null);
            recordingResolveRef.current = null;
          }
          setRecording(false);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.onerror = () => {
        setRecordingError('Recording error');
        setRecording(false);
      };

      mediaRecorder.start(100);
      setRecorder(mediaRecorder);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setRecordingError('Microphone access failed: ' + (err as Error).message);
      setRecording(false);
    }
  }, [isNative]);

  const handleClose = useCallback(() => {
    stopRecording();
    onClose();
  }, [onClose, stopRecording]);

  // Track previous open state to only reset on actual modal open
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Modal just opened - reset everything
      setContent("");
      setEmotions([]);
      setAudioUrl(null);
      setRecording(false);
      setRecorder(null);
      setRecordingError(null);
    }
    wasOpenRef.current = open;
    
    if (!open) {
      // Modal closed - stop recording
      stopRecording();
    }
  }, [open]); // Only depend on open, not stopRecording

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

  const canSubmit = (audioUrl || content.trim().length > 0 || recording) && content.length <= maxChars;

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
                variant={recording ? "destructive" : audioUrl ? "destructive" : "outline"}
                type="button"
                onClick={async () => {
                  if (recording) {
                    triggerVibration("important");
                    await stopRecording();
                    return;
                  }
                  if (audioUrl) {
                    // First click: delete existing recording
                    setAudioUrl(null);
                    return;
                  }
                  // Second click: start new recording
                  await startRecording();
                }}
              >
                {recording ? <Square size={12} /> : audioUrl ? <Square size={12} /> : <Mic size={12} />}
                {recording ? t("stopRecording", locale) : audioUrl ? t("deleteRecording", locale) : t("recordAudio", locale)}
              </Button>
              {recording && (
                <div className="flex-1 flex items-center justify-center gap-[3px] h-6 px-2">
                  {isNative ? (
                    // Simulated spectrum for native recording (no real data available)
                    <NativeSpectrum />
                  ) : (
                    // Real spectrum visualization for web recording
                    [0.3, 0.5, 0.7, 0.4, 0.9, 0.6, 0.8, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.7, 0.4].map((peak, i) => {
                      const h = 4 + (spectrumData[i % spectrumData.length] / 48) * 20 * peak;
                      return (
                        <div
                          key={i}
                          className="w-[3px] bg-red-500 rounded-full"
                          style={{ height: `${Math.max(4, Math.min(20, h))}px` }}
                        />
                      );
                    })
                  )}
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
            <div>
              {audioUrl ? <AudioAnchor src={audioUrl} locale={locale} /> : null}
            </div>
          </Card>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} type="button">
            {t("cancel", locale)}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={async () => {
              // Stop recording if active and get the audio URL
              let finalAudioUrl = audioUrl;
              if (recording) {
                finalAudioUrl = await stopRecording();
              }
              // Submit with the final audio URL (either existing or newly recorded)
              onSubmit({
                id: `journal-${Date.now()}`,
                date: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
                type: finalAudioUrl ? "audio" : "text",
                encryptedContent: "",
                content: finalAudioUrl ?? content.trim(),
                textContent: finalAudioUrl ? content.trim() || undefined : undefined,
                emotions,
              });
            }}
          >
            {t("save", locale)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JournalModal;
