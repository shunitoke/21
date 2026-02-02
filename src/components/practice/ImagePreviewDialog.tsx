"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";

interface ImagePreviewDialogProps {
  src: string | null;
  locale: Locale;
  onClose: () => void;
}

export function ImagePreviewDialog({ src, locale, onClose }: ImagePreviewDialogProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    if (src) return;
    pointersRef.current.clear();
    pinchRef.current = null;
    panRef.current = null;
    setTransform({ scale: 1, x: 0, y: 0 });
  }, [src]);

  const clampTransform = (next: { scale: number; x: number; y: number }) => {
    const viewport = viewportRef.current;
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      pinchRef.current = { distance: Math.hypot(dx, dy), scale: transform.scale };
    }
    if (pointersRef.current.size === 1) {
      panRef.current = { x: event.clientX - transform.x, y: event.clientY - transform.y };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!src) return;
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const points = Array.from(pointersRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      const nextScale = Math.min(3, Math.max(1, (distance / pinchRef.current.distance) * pinchRef.current.scale));
      setTransform((prev) => clampTransform({ ...prev, scale: nextScale }));
      return;
    }

    if (pointersRef.current.size === 1 && panRef.current) {
      setTransform((prev) => clampTransform({ ...prev, x: event.clientX - panRef.current!.x, y: event.clientY - panRef.current!.y }));
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) panRef.current = null;
  };

  return (
    <Dialog open={Boolean(src)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        className="h-[100svh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-none bg-background/95 p-0 text-foreground"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("image", locale)}</DialogTitle>
          <DialogDescription>{t("dialogDetails", locale)}</DialogDescription>
        </DialogHeader>
        <div
          ref={viewportRef}
          className="relative flex h-full w-full items-center justify-center overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--foreground)/0.12),_transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_hsl(var(--foreground)/0.08),_transparent_65%)]" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/70 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          </div>
          {src && (
            <img
              src={src}
              alt=""
              className="max-h-full max-w-full select-none drop-shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
              style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}
              draggable={false}
            />
          )}
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="absolute right-4 top-4 border-border/60 bg-background/80 text-foreground hover:bg-muted"
            onClick={onClose}
            aria-label={t("close", locale)}
          >
            <X size={16} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
