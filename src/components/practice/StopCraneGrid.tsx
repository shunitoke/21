"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { vibrationFeedback } from "@/utils/vibrationUtils";
import type { StopCraneItem, Locale } from "@/lib/types";
import AudioAnchor from "@/components/AudioAnchor";

interface StopCraneGridProps {
  items: StopCraneItem[];
  locale: Locale;
  imageThumbs: Record<string, string>;
  onReorder: (items: StopCraneItem[]) => void;
  onDelete: (item: StopCraneItem) => void;
  onImagePreview: (src: string) => void;
  onTextExpand: (content: string) => void;
  onStartBreathing: () => void;
  radioSrc: string | null;
  radioPlaying: boolean;
  radioBuffering: boolean;
  onToggleRadio: (src: string) => void;
  wobbleActive?: boolean;
}

interface SortableItemProps {
  item: StopCraneItem;
  locale: Locale;
  imageThumbs: Record<string, string>;
  isDragging: boolean;
  onDelete: (item: StopCraneItem) => void;
  onImagePreview: (src: string) => void;
  onTextExpand: (content: string) => void;
  onStartBreathing: () => void;
  radioSrc: string | null;
  radioPlaying: boolean;
  radioBuffering: boolean;
  onToggleRadio: (src: string) => void;
  wobbleClass: string;
}

const RadioAnchorInline = ({
  src,
  locale,
  radioSrc,
  radioPlaying,
  radioBuffering,
  onToggleRadio,
}: {
  src: string;
  locale: Locale;
  radioSrc: string | null;
  radioPlaying: boolean;
  radioBuffering: boolean;
  onToggleRadio: (src: string) => void;
}) => {
  const isActive = radioSrc === src && radioPlaying;
  const showBuffering = radioSrc === src && radioBuffering;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <Button
        variant="outline"
        size="icon-sm"
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleRadio(src);
        }}
        aria-label={isActive ? t("stopped", locale) : t("playing", locale)}
      >
        {isActive ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
      </Button>
      <div className="grid gap-1 min-w-0">
        <span className="text-xs font-semibold truncate">{t("radio", locale)}</span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground truncate">
          <span>{showBuffering ? t("buffering", locale) : isActive ? t("playing", locale) : t("stopped", locale)}</span>
          {isActive && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />}
        </span>
      </div>
    </div>
  );
};

const PlayIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);

const PauseIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
);

const SortableItem = ({
  item,
  locale,
  imageThumbs,
  isDragging,
  onDelete,
  onImagePreview,
  onTextExpand,
  onStartBreathing,
  radioSrc,
  radioPlaying,
  radioBuffering,
  onToggleRadio,
  wobbleClass,
}: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isSortableDragging ? 9999 : 1,
    position: "relative" as const,
    opacity: 1,
    willChange: isSortableDragging ? "transform" as const : "auto" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid gap-2 ${wobbleClass}`}
      {...attributes}
      {...listeners}
    >
      <Card
        className="transition-[box-shadow,transform] duration-200 ease-out"
        style={{
          boxShadow: isDragging ? "0 25px 50px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.08)",
          touchAction: "none",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <CardContent className="grid gap-3 px-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <GripVertical size={14} />
              {item.type}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item);
              }}
              aria-label={t("delete", locale)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
          {item.type === "audio" ? (
            <AudioAnchor src={item.content} locale={locale} />
          ) : item.type === "radio" ? (
            <RadioAnchorInline
              src={item.content}
              locale={locale}
              radioSrc={radioSrc}
              radioPlaying={radioPlaying}
              radioBuffering={radioBuffering}
              onToggleRadio={onToggleRadio}
            />
          ) : item.type === "image" ? (
            <button
              type="button"
              className="overflow-hidden rounded-lg"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onImagePreview(item.content);
              }}
            >
              <img src={imageThumbs[item.id] ?? item.content} alt="" className="h-40 w-full object-cover" />
            </button>
          ) : item.type === "stop" ? (
            <button
              type="button"
              className={`group relative mx-auto flex h-[96px] w-[96px] items-center justify-center overflow-hidden rounded-full border border-red-700/40 bg-gradient-to-b from-red-500 via-red-600 to-red-700 shadow-[0_12px_24px_rgba(127,29,29,0.35),inset_0_2px_6px_rgba(255,255,255,0.3),inset_0_-6px_10px_rgba(0,0,0,0.22)] transition-transform active:translate-y-[2px] ${wobbleClass}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onStartBreathing();
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_55%)]" />
              <div className="absolute inset-2.5 rounded-full border border-white/15" />
              <div className="relative grid place-items-center text-center">
                <span className="text-[11px] uppercase tracking-[0.55em] text-red-100/80">{t("stop", locale)}</span>
                <span className="mt-2 text-[24px] font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]">STOP</span>
                <span className="mt-2 text-xs text-red-100/85">{t("breathing", locale)}</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              className="text-left"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (item.type === "link") {
                  window.open(item.content, "_blank", "noopener,noreferrer");
                  return;
                }
                onTextExpand(item.content);
              }}
            >
              <p className={`text-sm leading-snug ${item.type === "link" ? "break-all" : "break-words"}`}>{item.content}</p>
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export function StopCraneGrid({
  items,
  locale,
  imageThumbs,
  onReorder,
  onDelete,
  onImagePreview,
  onTextExpand,
  onStartBreathing,
  radioSrc,
  radioPlaying,
  radioBuffering,
  onToggleRadio,
  wobbleActive = false,
}: StopCraneGridProps) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    document.body.style.overflow = "hidden";
    const root = document.querySelector<HTMLDivElement>(".app-root");
    if (root) root.style.overflow = "hidden";
    vibrationFeedback.dragStart();
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      document.body.style.overflow = "";
      const root = document.querySelector<HTMLDivElement>(".app-root");
      if (root) root.style.overflow = "";

      if (over && active.id !== over.id) {
        const oldIndex = orderedItems.findIndex((item) => item.id === active.id);
        const newIndex = orderedItems.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(orderedItems, oldIndex, newIndex);
        setOrderedItems(newOrder);
        onReorder(newOrder);
        vibrationFeedback.dropSuccess();
      }
    },
    [orderedItems, onReorder]
  );

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      const root = document.querySelector<HTMLDivElement>(".app-root");
      if (root) root.style.overflow = "";
    };
  }, []);

  const wobbleClasses = ["animate-anchor-wobble", "animate-anchor-wobble-1", "animate-anchor-wobble-2", "animate-anchor-wobble-3"];

  if (orderedItems.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("pinAnchorsEmpty", locale)}</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      <SortableContext items={orderedItems.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div ref={gridRef} className="relative grid grid-cols-2 gap-3 pb-6">
          {orderedItems.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              locale={locale}
              imageThumbs={imageThumbs}
              isDragging={activeId === item.id}
              onDelete={onDelete}
              onImagePreview={onImagePreview}
              onTextExpand={onTextExpand}
              onStartBreathing={onStartBreathing}
              radioSrc={radioSrc}
              radioPlaying={radioPlaying}
              radioBuffering={radioBuffering}
              onToggleRadio={onToggleRadio}
              wobbleClass={wobbleActive ? wobbleClasses[index % 4] : ""}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
