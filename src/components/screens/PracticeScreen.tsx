"use client";

import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, ChevronUp, Filter, GripVertical, Moon, Pause, Play, Sun, Trash2, X, FileText, Mic } from "lucide-react";
import type { JournalEntry, Locale, StopCraneItem } from "@/lib/types";
import { t } from "@/lib/i18n";
const JournalModal = dynamic(() => import("@/components/JournalModal"), { ssr: false });
const AnchorModal = dynamic(() => import("@/components/AnchorModal"), { ssr: false });
const AudioAnchor = dynamic(() => import("@/components/AudioAnchor"), { ssr: false });
const EmotionSelector = dynamic(() => import("@/components/EmotionSelector"), { ssr: false });
const JournalTimeline = dynamic(() => import("@/components/JournalEntryCard").then(mod => ({ default: mod.JournalTimeline })), { ssr: false });
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { triggerVibration, vibrationFeedback } from "@/utils/vibrationUtils";

const emotionLabels: Record<string, { ru: string; en: string }> = {
  спокойствие: { ru: "Спокойствие", en: "Calm" },
  энергия: { ru: "Энергия", en: "Energy" },
  благодарность: { ru: "Благодарность", en: "Gratitude" },
  любовь: { ru: "Любовь", en: "Love" },
  гордость: { ru: "Гордость", en: "Pride" },
  уверенность: { ru: "Уверенность", en: "Confidence" },
  фокус: { ru: "Фокус", en: "Focus" },
  вдохновение: { ru: "Вдохновение", en: "Inspiration" },
  тревога: { ru: "Тревога", en: "Anxiety" },
  грусть: { ru: "Грусть", en: "Sadness" },
};

const getDateCutoff = (type: "all" | "today" | "week" | "month" | "year") => {
  if (type === "all") return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offsetDays = type === "today" ? 0 : type === "week" ? 7 : type === "month" ? 30 : 365;
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - offsetDays);
  return cutoff;
};

const filterJournalEntries = (
  journal: JournalEntry[],
  dateFilterType: "all" | "today" | "week" | "month" | "year",
  selectedEmotions: string[],
  sortBy: "newest" | "oldest"
) => {
  const cutoff = getDateCutoff(dateFilterType);
  const filtered = journal.filter((entry) => {
    if (cutoff && new Date(entry.date) < cutoff) return false;
    if (selectedEmotions.length > 0 && !entry.emotions?.some((emotion) => selectedEmotions.includes(emotion))) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortBy === "newest" ? timeB - timeA : timeA - timeB;
  });
};

const getEntryPreview = (entry: JournalEntry, locale: Locale) =>
  entry.type === "audio"
    ? t("entryTypeAudio", locale)
    : `${entry.content.slice(0, 80)}${entry.content.length > 80 ? "..." : ""}`;

const JournalToolbar = ({
  locale,
  dateFilterType,
  selectedEmotions,
  sortBy,
  collapsed,
  onOpenFilters,
  onToggleSort,
  onToggleCollapsed,
}: {
  locale: Locale;
  dateFilterType: "all" | "today" | "week" | "month" | "year";
  selectedEmotions: string[];
  sortBy: "newest" | "oldest";
  collapsed: boolean;
  onOpenFilters: () => void;
  onToggleSort: () => void;
  onToggleCollapsed: () => void;
}) => {
  const filterActive = dateFilterType !== "all" || selectedEmotions.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs" variant="outline" type="button" onClick={onOpenFilters}>
        <Filter size={12} />
        {t("filter", locale)}
      </Button>
      {filterActive && (
        <Badge variant="secondary" className="text-[10px]">
          {t("filterActive", locale)}
        </Badge>
      )}
      <Button size="xs" variant="outline" type="button" onClick={onToggleSort}>
        {sortBy === "newest" ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        {sortBy === "newest" ? t("sortNewest", locale) : t("sortOldest", locale)}
      </Button>
      <Button size="xs" variant="outline" type="button" onClick={onToggleCollapsed}>
        {collapsed ? t("expandAll", locale) : t("collapseAll", locale)}
      </Button>
    </div>
  );
};

const breathingPhases = ["inhale", "hold", "exhale"] as const;
type BreathingPhase = (typeof breathingPhases)[number];

const phaseLabels: Record<BreathingPhase, { ru: string; en: string }> = {
  inhale: { ru: "Вдох", en: "Inhale" },
  hold: { ru: "Задержка", en: "Hold" },
  exhale: { ru: "Выдох", en: "Exhale" },
};

const phaseDescriptions: Record<BreathingPhase, { ru: string; en: string }> = {
  inhale: { ru: "Медленно наполняйте лёгкие", en: "Slowly fill the lungs" },
  hold: { ru: "Сохраняйте паузу ровно", en: "Hold the pause steadily" },
  exhale: { ru: "Мягко выпускайте воздух", en: "Gently release the air" },
};

const breathingDots = Array.from({ length: 6 }, (_, index) => index);

const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));

  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return isVisible;
};

interface PracticeScreenProps {
  locale: Locale;
  journal: JournalEntry[];
  stopCrane: StopCraneItem[];
  onAddStopCrane: (item: StopCraneItem) => void;
  onRemoveStopCrane: (id: string) => void;
  onReorderStopCrane: (items: StopCraneItem[]) => void;
  onAddJournal: (entry: JournalEntry) => void;
  onRemoveJournal: (id: string) => void;
  radioSrc: string | null;
  radioPlaying: boolean;
  radioBuffering: boolean;
  onToggleRadio: (src: string) => void;
  isActive?: boolean;
}

const PracticeScreen = ({
  locale,
  journal,
  stopCrane,
  onAddStopCrane,
  onRemoveStopCrane,
  onReorderStopCrane,
  onAddJournal,
  onRemoveJournal,
  radioSrc,
  radioPlaying,
  radioBuffering,
  onToggleRadio,
  isActive = true,
}: PracticeScreenProps) => {
  const isPageVisible = usePageVisibility();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [anchorModalOpen, setAnchorModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [anchorToDelete, setAnchorToDelete] = useState<StopCraneItem | null>(null);
  const [journalToDelete, setJournalToDelete] = useState<JournalEntry | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [collapsed, setCollapsed] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [tempDateFilterType, setTempDateFilterType] = useState(dateFilterType);
  const [tempSelectedEmotions, setTempSelectedEmotions] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [orderedStopCrane, setOrderedStopCrane] = useState(stopCrane);
  const [imageThumbs, setImageThumbs] = useState<Record<string, string>>({});
  const anchorGridRef = useRef<HTMLDivElement | null>(null);
  const dragBlockRef = useRef(false);
  const dragTimeoutRef = useRef<number | null>(null);
  const anchorHoldTimeoutRef = useRef<number | null>(null);
  const lastSwapIndexRef = useRef<number | null>(null);
  const imageViewportRef = useRef<HTMLDivElement | null>(null);
  const imagePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const imagePinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const imagePanRef = useRef<{ x: number; y: number } | null>(null);
  const [imageTransform, setImageTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [breathingOpen, setBreathingOpen] = useState(false);
  const [breathingPhaseIndex, setBreathingPhaseIndex] = useState(0);
  const [breathingSeconds, setBreathingSeconds] = useState(4);
  const [breathingCycle, setBreathingCycle] = useState(1);
  const [breathingElapsed, setBreathingElapsed] = useState(0);
  const [screenDarkMode, setScreenDarkMode] = useState(false);
  const isDarkTheme = screenDarkMode;
  const [anchorWobbleActive, setAnchorWobbleActive] = useState(false);
  const anchorWobbleTimeoutRef = useRef<number | null>(null);
  const pageSize = 8;
  const breathingPhase = breathingPhases[breathingPhaseIndex];
  const cycleBrightness = 0.6 + (breathingCycle % 4) * 0.12;

  const RadioAnchorInline = ({ src }: { src: string }) => {
    const isActive = radioSrc === src && radioPlaying;
    const showBuffering = radioSrc === src && radioBuffering;

    return (
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onTouchStart={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleRadio(src);
          }}
          aria-label={isActive ? t("stopped", locale) : t("playing", locale)}
        >
          {isActive ? <Pause size={14} /> : <Play size={14} />}
        </Button>
        <div className="grid gap-1 min-w-0">
          <span className="text-xs font-semibold truncate">{t("radio", locale)}</span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground truncate">
            <span>
              {showBuffering ? t("buffering", locale) : isActive ? t("playing", locale) : t("stopped", locale)}
            </span>
            {isActive && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            )}
          </span>
        </div>
      </div>
    );
  };

  const filteredJournal = useMemo(
    () => filterJournalEntries(journal, dateFilterType, selectedEmotions, sortBy),
    [journal, dateFilterType, selectedEmotions, sortBy]
  );

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [journal, dateFilterType, selectedEmotions, sortBy]);

  useEffect(() => {
    setOrderedStopCrane(stopCrane);
  }, [stopCrane]);

  useEffect(() => {
    let cancelled = false;
    const loadThumbnail = async (id: string, src: string) => {
      if (imageThumbs[id]) return;
      try {
        const img = new Image();
        img.decoding = "async";
        img.crossOrigin = "anonymous";
        img.src = src;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image load failed"));
        });
        const maxSize = 240;
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.drawImage(img, 0, 0, width, height);
        const thumb = canvas.toDataURL("image/jpeg", 0.72);
        if (!cancelled) {
          setImageThumbs((prev) => (prev[id] ? prev : { ...prev, [id]: thumb }));
        }
      } catch {
        if (!cancelled) {
          setImageThumbs((prev) => (prev[id] ? prev : { ...prev, [id]: src }));
        }
      }
    };

    orderedStopCrane
      .filter((item) => item.type === "image")
      .forEach((item) => {
        void loadThumbnail(item.id, item.content);
      });

    return () => {
      cancelled = true;
    };
  }, [orderedStopCrane, imageThumbs]);

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) window.clearTimeout(dragTimeoutRef.current);
      if (anchorHoldTimeoutRef.current) window.clearTimeout(anchorHoldTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (imagePreview) return;
    imagePointersRef.current.clear();
    imagePinchRef.current = null;
    imagePanRef.current = null;
    setImageTransform({ scale: 1, x: 0, y: 0 });
  }, [imagePreview]);

  useEffect(() => {
    if (!breathingOpen || !isPageVisible) return;
    setBreathingPhaseIndex(0);
    setBreathingSeconds(4);
    setBreathingCycle(1);
    setBreathingElapsed(0);
    const timer = window.setInterval(() => {
      setBreathingElapsed((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [breathingOpen, isPageVisible]);

  useEffect(() => {
    if (!breathingOpen || !isPageVisible) return;
    const remainder = breathingElapsed % 4;
    const nextSeconds = remainder === 0 ? 4 : 4 - remainder;
    const nextPhaseIndex = Math.floor(breathingElapsed / 4) % breathingPhases.length;
    const nextCycle = Math.floor(breathingElapsed / (4 * breathingPhases.length)) + 1;
    setBreathingSeconds(nextSeconds);
    setBreathingPhaseIndex(nextPhaseIndex);
    setBreathingCycle(nextCycle);
  }, [breathingElapsed, breathingOpen, isPageVisible]);

  useEffect(() => {
    if (!breathingOpen || !isPageVisible) return;
    triggerVibration("light");
  }, [breathingOpen, breathingPhase, isPageVisible]);

  const triggerAnchorWobble = useCallback(() => {
    if (anchorWobbleTimeoutRef.current) {
      window.clearTimeout(anchorWobbleTimeoutRef.current);
    }
    setAnchorWobbleActive(true);
    anchorWobbleTimeoutRef.current = window.setTimeout(() => {
      setAnchorWobbleActive(false);
      anchorWobbleTimeoutRef.current = null;
    }, 360);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    triggerAnchorWobble();
  }, [isActive, triggerAnchorWobble]);

  useEffect(() => {
    return () => {
      if (anchorWobbleTimeoutRef.current) {
        window.clearTimeout(anchorWobbleTimeoutRef.current);
      }
    };
  }, []);

  const pagedJournal = useMemo(
    () => filteredJournal.slice(0, visibleCount),
    [filteredJournal, visibleCount]
  );

  const blockClick = () => {
    dragBlockRef.current = true;
    if (dragTimeoutRef.current) window.clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = window.setTimeout(() => {
      dragBlockRef.current = false;
    }, 140);
  };

  const commitAnchorOrder = (next: StopCraneItem[]) => {
    if (next.length === 0) return;
    if (next.map((item) => item.id).join("|") === stopCrane.map((item) => item.id).join("|")) return;
    onReorderStopCrane(next);
  };

  const clampTransform = (next: { scale: number; x: number; y: number }) => {
    const viewport = imageViewportRef.current;
    if (!viewport) return next;
    const rect = viewport.getBoundingClientRect();
    const maxX = Math.max(0, ((next.scale - 1) * rect.width) / 2);
    const maxY = Math.max(0, ((next.scale - 1) * rect.height) / 2);
    return {
      scale: next.scale,
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  };

  const handleImagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    imagePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (imagePointersRef.current.size === 2) {
      const points = Array.from(imagePointersRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      imagePinchRef.current = { distance: Math.hypot(dx, dy), scale: imageTransform.scale };
    }
    if (imagePointersRef.current.size === 1) {
      imagePanRef.current = { x: event.clientX - imageTransform.x, y: event.clientY - imageTransform.y };
    }
  };

  const handleImagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!imagePreview) return;
    if (!imagePointersRef.current.has(event.pointerId)) return;
    imagePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (imagePointersRef.current.size === 2 && imagePinchRef.current) {
      const points = Array.from(imagePointersRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      const nextScale = Math.min(3, Math.max(1, (distance / imagePinchRef.current.distance) * imagePinchRef.current.scale));
      setImageTransform((prev) => clampTransform({ ...prev, scale: nextScale }));
      return;
    }

    if (imagePointersRef.current.size === 1 && imagePanRef.current) {
      setImageTransform((prev) => clampTransform({ ...prev, x: event.clientX - imagePanRef.current!.x, y: event.clientY - imagePanRef.current!.y }));
    }
  };

  const handleImagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    imagePointersRef.current.delete(event.pointerId);
    if (imagePointersRef.current.size < 2) imagePinchRef.current = null;
    if (imagePointersRef.current.size === 0) imagePanRef.current = null;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAnchorDragStart = useCallback((event: DragStartEvent) => {
    setActiveAnchorId(event.active.id as string);
    document.body.style.overflow = "hidden";
    vibrationFeedback.dragStart();
  }, []);

  const handleAnchorDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAnchorId(null);
    document.body.style.overflow = "";

    if (over && active.id !== over.id) {
      const oldIndex = orderedStopCrane.findIndex((item) => item.id === active.id);
      const newIndex = orderedStopCrane.findIndex((item) => item.id === over.id);
      const newOrder = arrayMove(orderedStopCrane, oldIndex, newIndex);
      setOrderedStopCrane(newOrder);
      
      const ids = newOrder.map((item) => item.id);
      const currentIds = stopCrane.map((item) => item.id);
      if (ids.join("|") !== currentIds.join("|")) {
        onReorderStopCrane(newOrder);
      }
      
      vibrationFeedback.dropSuccess();
    }
  }, [orderedStopCrane, stopCrane, onReorderStopCrane]);

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0",
        },
      },
    }),
  };

  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);

  const SortableAnchorItem = ({ item, index }: { item: StopCraneItem; index: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 9999 : 1,
      position: "relative" as const,
      opacity: isDragging ? 0 : 1,
    };

    const wobbleClass = anchorWobbleActive
      ? ["animate-anchor-wobble", "animate-anchor-wobble-1", "animate-anchor-wobble-2", "animate-anchor-wobble-3"][index % 4]
      : "";

    return (
      <div ref={setNodeRef} style={style} className={`grid gap-2 ${wobbleClass}`}>
        <Card 
          className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          style={{
            boxShadow: isDragging ? "0 25px 50px rgba(0,0,0,0.35)" : "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <CardContent className="grid gap-3 px-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground"
                aria-label={t("drag", locale)}
                style={{ touchAction: "none" }}
                {...attributes}
                {...listeners}
              >
                <GripVertical size={14} />
                {item.type}
              </button>
              <Button
                size="icon-sm"
                variant="outline"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setAnchorToDelete(item);
                }}
                aria-label={t("delete", locale)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
            {item.type === "audio" ? (
              <AudioAnchor src={item.content} locale={locale} />
            ) : item.type === "radio" ? (
              <RadioAnchorInline src={item.content} />
            ) : item.type === "image" ? (
              <button
                type="button"
                className="overflow-hidden rounded-lg"
                onClick={(event) => {
                  event.stopPropagation();
                  setImagePreview(item.content);
                }}
              >
                <img
                  src={imageThumbs[item.id] ?? item.content}
                  alt=""
                  className="h-40 w-full object-cover"
                />
              </button>
            ) : item.type === "stop" ? (
              <button
                type="button"
                className={`group relative mx-auto flex h-[96px] w-[96px] items-center justify-center overflow-hidden rounded-full border border-red-700/40 bg-gradient-to-b from-red-500 via-red-600 to-red-700 shadow-[0_12px_24px_rgba(127,29,29,0.35),inset_0_2px_6px_rgba(255,255,255,0.3),inset_0_-6px_10px_rgba(0,0,0,0.22)] transition-transform active:translate-y-[2px] ${wobbleClass}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setBreathingOpen(true);
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_55%)]" />
                <div className="absolute inset-2.5 rounded-full border border-white/15" />
                <div className="relative grid place-items-center text-center">
                  <span className="text-[11px] uppercase tracking-[0.55em] text-red-100/80">{t("stop", locale)}</span>
                  <span className="mt-2 text-[24px] font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]">
                    STOP
                  </span>
                  <span className="mt-2 text-xs text-red-100/85">{t("breathing", locale)}</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                className="text-left"
                onClick={(event) => {
                  event.stopPropagation();
                  if (item.type === "link") {
                    window.open(item.content, "_blank", "noopener,noreferrer");
                    return;
                  }
                  setExpanded(item.content);
                  setTextModalOpen(true);
                }}
              >
                <p className={`text-sm leading-snug ${item.type === "link" ? "break-all" : "break-words"}`}>
                  {item.content}
                </p>
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const activeAnchorItem = activeAnchorId ? orderedStopCrane.find((item) => item.id === activeAnchorId) : null;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("anchors", locale)}</CardTitle>
            <Button size="sm" onClick={() => setAnchorModalOpen(true)}>
              {t("newStopCrane", locale)}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-0 sm:px-6">
          {orderedStopCrane.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("pinAnchorsEmpty", locale)}</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleAnchorDragStart}
              onDragEnd={handleAnchorDragEnd}
            >
              <SortableContext items={orderedStopCrane.map(item => item.id)} strategy={rectSortingStrategy}>
                <div
                  ref={anchorGridRef}
                  className="relative grid grid-cols-2 gap-3 pb-2"
                  style={{ contain: 'layout paint style' }}
                >
                  {orderedStopCrane.map((item, index) => (
                    <SortableAnchorItem key={item.id} item={item} index={index} />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={dropAnimation}>
                {activeAnchorItem ? (
                  <Card
                    style={{
                      boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
                      transform: "scale(1.03)",
                    }}
                  >
                    <CardContent className="grid gap-3 px-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                          <GripVertical size={14} />
                          {activeAnchorItem.type}
                        </span>
                      </div>
                      {activeAnchorItem.type === "image" ? (
                        <div className="overflow-hidden rounded-lg">
                          <img
                            src={imageThumbs[activeAnchorItem.id] ?? activeAnchorItem.content}
                            alt=""
                            className="h-40 w-full object-cover"
                          />
                        </div>
                      ) : activeAnchorItem.type === "stop" ? (
                        <div className="group relative mx-auto flex h-[96px] w-[96px] items-center justify-center overflow-hidden rounded-full border border-red-700/40 bg-gradient-to-b from-red-500 via-red-600 to-red-700">
                          <span className="text-[24px] font-black text-white">STOP</span>
                        </div>
                      ) : (
                        <p className="text-sm leading-snug break-words line-clamp-3">
                          {activeAnchorItem.content}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("journal", locale)}</CardTitle>
            <Button size="sm" onClick={() => setJournalModalOpen(true)}>
              {t("addEntry", locale)}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {journal.length > 0 && (
            <JournalToolbar
              locale={locale}
              dateFilterType={dateFilterType}
              selectedEmotions={selectedEmotions}
              sortBy={sortBy}
              collapsed={collapsed}
              onOpenFilters={() => {
                setTempDateFilterType(dateFilterType);
                setTempSelectedEmotions([...selectedEmotions]);
                setFilterOpen(true);
              }}
              onToggleSort={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
              onToggleCollapsed={() => setCollapsed(!collapsed)}
            />
          )}
          {journal.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noEntriesYet", locale)}</p>
          ) : (
            <div className="pl-2" style={{ contain: 'layout paint' }}>
              <JournalTimeline
                entries={pagedJournal}
                locale={locale}
                onDelete={setJournalToDelete}
                collapsed={collapsed}
              />
            {filteredJournal.length > visibleCount && (
              <div className="flex justify-center">
                <Button type="button" variant="outline" onClick={() => setVisibleCount((prev) => prev + pageSize)}>
                  {t("showMore", locale)}
                </Button>
              </div>
            )}
          </div>
        )}
        </CardContent>
      </Card>

      <Dialog
        open={textModalOpen}
        onOpenChange={(value) => {
          if (!value) {
            setTextModalOpen(false);
            setExpanded(null);
          }
        }}
      >
        <DialogContent className="max-w-[520px]" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader className="sr-only">
            <DialogTitle>{t("anchors", locale)}</DialogTitle>
            <DialogDescription>{t("dialogDetails", locale)}</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-snug break-words">{expanded}</p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(imagePreview)}
        onOpenChange={(value) => (!value ? setImagePreview(null) : null)}
      >
        <DialogContent
          className="h-[100svh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-none bg-background/95 p-0 text-foreground"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{t("image", locale)}</DialogTitle>
            <DialogDescription>{t("dialogDetails", locale)}</DialogDescription>
          </DialogHeader>
          <div
            ref={imageViewportRef}
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            onPointerDown={handleImagePointerDown}
            onPointerMove={handleImagePointerMove}
            onPointerUp={handleImagePointerUp}
            onPointerCancel={handleImagePointerUp}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--foreground)/0.12),_transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_hsl(var(--foreground)/0.08),_transparent_65%)]" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/70 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>
            {imagePreview && (
              <img
                src={imagePreview}
                alt=""
                className="max-h-full max-w-full select-none drop-shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
                style={{ transform: `translate3d(${imageTransform.x}px, ${imageTransform.y}px, 0) scale(${imageTransform.scale})` }}
                draggable={false}
              />
            )}
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="absolute right-4 top-4 border-border/60 bg-background/80 text-foreground hover:bg-muted"
              onClick={() => setImagePreview(null)}
              aria-label={t("close", locale)}
            >
              <X size={16} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AnchorModal
        open={anchorModalOpen}
        locale={locale}
        existing={stopCrane}
        onClose={() => setAnchorModalOpen(false)}
        onSubmit={(item) => {
          onAddStopCrane(item);
          setAnchorModalOpen(false);
        }}
      />
      <JournalModal
        open={journalModalOpen}
        locale={locale}
        onClose={() => setJournalModalOpen(false)}
        onSubmit={(entry) => {
          onAddJournal(entry);
          setJournalModalOpen(false);
        }}
      />
      <Dialog open={filterOpen} onOpenChange={(value) => (!value ? setFilterOpen(false) : null)}>
        <DialogContent className="max-w-[520px] gap-4">
          <DialogHeader>
            <DialogTitle>{t("journalFilter", locale)}</DialogTitle>
            <DialogDescription className="sr-only">{t("dialogDetails", locale)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">{t("period", locale)}</p>
              <div className="flex flex-wrap gap-2">
                {["all", "today", "week", "month", "year"].map((period) => (
                  <Button
                    key={period}
                    type="button"
                    size="xs"
                    variant={tempDateFilterType === period ? "default" : "outline"}
                    onClick={() => setTempDateFilterType(period as typeof tempDateFilterType)}
                  >
                    {t(`period_${period}`, locale)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">{t("chooseEmotions", locale)}</p>
              <EmotionSelector
                locale={locale}
                selected={tempSelectedEmotions}
                onToggle={(id) =>
                  setTempSelectedEmotions((prev) =>
                    prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                  )
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={() => setFilterOpen(false)}>
                {t("cancel", locale)}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setTempDateFilterType("all");
                  setTempSelectedEmotions([]);
                }}
              >
                {t("reset", locale)}
              </Button>
            </div>
            <Button
              type="button"
              onClick={() => {
                setDateFilterType(tempDateFilterType);
                setSelectedEmotions(tempSelectedEmotions);
                setFilterOpen(false);
              }}
            >
              {t("apply", locale)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(anchorToDelete)} onOpenChange={(value: boolean) => (!value ? setAnchorToDelete(null) : null)}>
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAnchorTitle", locale)}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteAnchorDescription", locale)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", locale)}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!anchorToDelete) return;
                onRemoveStopCrane(anchorToDelete.id);
                setAnchorToDelete(null);
              }}
            >
              {t("delete", locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(journalToDelete)} onOpenChange={(value: boolean) => (!value ? setJournalToDelete(null) : null)}>
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteJournalTitle", locale)}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteJournalDescription", locale)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", locale)}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!journalToDelete) return;
                onRemoveJournal(journalToDelete.id);
                setJournalToDelete(null);
              }}
            >
              {t("delete", locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={breathingOpen} onOpenChange={(value) => (!value ? setBreathingOpen(false) : null)}>
        <DialogContent
          className={`h-[100svh] w-screen max-w-none overflow-hidden rounded-none border-none p-0 ${
            isDarkTheme ? "bg-[#0f1217] text-[#f3f2ee]" : "bg-[#f6f5f3] text-[#0e1220]"
          }`}
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{t("breathing", locale)}</DialogTitle>
            <DialogDescription>{t("dialogDetails", locale)}</DialogDescription>
          </DialogHeader>
          <div className="relative flex h-full w-full flex-col px-6 py-10 sm:px-12">
            <div className="pointer-events-none absolute inset-0">
              <div
                className={`absolute inset-0 ${
                  isDarkTheme
                    ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_60%)]"
                    : "bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.05),_transparent_60%)]"
                }`}
              />
              <div
                className={`absolute inset-0 ${
                  isDarkTheme
                    ? "bg-[linear-gradient(180deg,_rgba(15,18,23,0.9)_0%,_rgba(15,18,23,0.85)_40%,_rgba(15,18,23,1)_100%)]"
                    : "bg-[linear-gradient(180deg,_rgba(255,255,255,0.8)_0%,_rgba(246,245,243,0.95)_40%,_rgba(246,245,243,1)_100%)]"
                }`}
              />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.5em] opacity-60">
                  {locale === "ru" ? "Дыхание" : "Breathing"}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[0.08em]">
                  {locale === "ru" ? phaseLabels[breathingPhase].ru : phaseLabels[breathingPhase].en}
                </p>
                <p className={`mt-2 text-sm ${isDarkTheme ? "text-[#b8b4af]" : "text-[#7b7f86]"}`}>
                  {locale === "ru" ? "Вдох • Задержка • Выдох" : "Inhale • Hold • Exhale"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] opacity-60">
                  {isDarkTheme ? <Moon size={14} /> : <Sun size={14} />}
                  <Switch
                    checked={isDarkTheme}
                    onCheckedChange={setScreenDarkMode}
                    className={isDarkTheme ? undefined : "data-[state=unchecked]:bg-black/20 data-[state=checked]:bg-black/70"}
                    aria-label={locale === "ru" ? "Тема экрана" : "Screen theme"}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-full border ${
                    isDarkTheme
                      ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      : "border-black/10 bg-white/70 text-black/70 hover:bg-white"
                  }`}
                  onClick={() => setBreathingOpen(false)}
                  aria-label={t("close", locale)}
                >
                  <X size={18} />
                </Button>
              </div>
            </div>
            <div className="relative z-0 flex flex-1 flex-col items-center justify-center">
              <motion.div
                className="relative grid place-items-center transform-gpu"
                style={{ willChange: "transform", contain: 'layout style' }}
                animate={{
                  scale: breathingPhase === "inhale" ? 1.18 : breathingPhase === "exhale" ? 0.82 : 1.02,
                }}
                transition={{ duration: 4, ease: "easeInOut" }}
              >
                <div
                  className={`absolute size-[240px] rounded-full ${isDarkTheme ? "bg-[#2f7bff]" : "bg-[#f3e7db]"}`}
                  style={{
                    opacity: isDarkTheme ? 0.45 * cycleBrightness : 1,
                  }}
                />
                {breathingDots.map((index) => (
                  <span
                    key={`breath-layer-${index}`}
                    className={`absolute size-[240px] rounded-full ${isDarkTheme ? "bg-[#5aa8ff]" : "bg-[#f7ede2]"}`}
                    style={{
                      opacity: (isDarkTheme ? 0.25 : 0.35) * cycleBrightness,
                      transform: `rotate(${index * 30}deg)`,
                    }}
                  />
                ))}
                <div
                  className={`absolute size-[180px] rounded-full ${isDarkTheme ? "bg-[#7cc6ff]" : "bg-[#f1d7c2]/70"}`}
                  style={{
                    opacity: isDarkTheme ? 0.45 * cycleBrightness : 1,
                  }}
                />
                <div
                  className={`absolute size-[120px] rounded-full ${isDarkTheme ? "bg-[#c0e4ff]" : "bg-[#f0c8aa]/65"}`}
                  style={{
                    opacity: isDarkTheme ? 0.5 * cycleBrightness : 1,
                  }}
                />
              </motion.div>
            </div>
            <p
              className={`relative z-10 mt-auto pb-8 text-center text-sm ${
                isDarkTheme ? "text-[#b8b4af]" : "text-[#7b7f86]"
              }`}
            >
              {locale === "ru" ? phaseDescriptions[breathingPhase].ru : phaseDescriptions[breathingPhase].en}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticeScreen;
