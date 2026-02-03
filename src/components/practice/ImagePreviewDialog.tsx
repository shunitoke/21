"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef(0);

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

  const resetTransform = () => setTransform({ scale: 1, x: 0, y: 0 });

  const handleTap = () => {
    const now = Date.now();
    const doubleTapThreshold = 300;
    if (now - lastTapRef.current < doubleTapThreshold) {
      // Double tap - toggle zoom
      setTransform((prev) => (prev.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2, x: 0, y: 0 }));
    } else {
      // Single tap - close if zoomed out
      if (transform.scale <= 1.1) {
        onClose();
      } else {
        resetTransform();
      }
    }
    lastTapRef.current = now;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    touchStartRef.current = { x: event.clientX, y: event.clientY, time: Date.now() };
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
    const start = touchStartRef.current;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      panRef.current = null;
      // Check for swipe down to close or tap
      if (start) {
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        const duration = Date.now() - start.time;
        const velocity = dy / duration;
        // Swipe down with enough velocity and distance
        if (dy > 80 && velocity > 0.3 && Math.abs(dx) < 100) {
          onClose();
          return;
        }
        // Small movement = tap
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && duration < 300) {
          handleTap();
        }
      }
      touchStartRef.current = null;
    }
  };

  if (!src) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={viewportRef}
        className="relative animate-in zoom-in-95 duration-200"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt=""
          className="select-none max-h-[85svh] max-w-[85vw] object-contain"
          style={{ 
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`, 
            transition: panRef.current ? 'none' : 'transform 0.2s ease'
          }}
          draggable={false}
        />
      </div>
    </div>,
    document.body
  );
}
