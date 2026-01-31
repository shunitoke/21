"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { HabitLog } from "@/lib/types";
import { getPastDays } from "@/lib/date";

interface HeatmapProps {
  logs: HabitLog[];
  accent: string;
  days?: number;
  dates?: string[];
  dailyTarget?: number;
  colorsByDate?: Record<string, string>;
  intensityByDate?: Record<string, number>;
}

// 20 years of frontend wisdom: Canvas + CSS var resolution
const Heatmap = ({
  logs,
  accent,
  days = 196,
  dates,
  dailyTarget = 1,
  colorsByDate,
  intensityByDate,
}: HeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(28);
  const [cellSize, setCellSize] = useState(10);
  const [gap, setGap] = useState(2);
  const colorCache = useRef<Map<string, string>>(new Map());

  const target = Math.max(1, dailyTarget);

  const logMap = useMemo(() => {
    const m = new Map<string, HabitLog>();
    logs.forEach((l) => m.set(l.date, l));
    return m;
  }, [logs]);

  const allDates = useMemo(() => {
    if (dates) return dates;
    const base = Math.max(7, Math.floor(days / 7) * 7);
    const c = Math.max(1, cols ?? Math.ceil(base / 7));
    return getPastDays(Math.max(7, Math.floor(Math.max(base, c * 7) / 7) * 7));
  }, [dates, days, cols]);

  // Resolve CSS var to actual color value
  const resolve = (cssVar: string): string => {
    if (colorCache.current.has(cssVar)) return colorCache.current.get(cssVar)!;
    const el = document.createElement("div");
    el.style.color = cssVar;
    document.body.appendChild(el);
    const rgb = getComputedStyle(el).color;
    document.body.removeChild(el);
    colorCache.current.set(cssVar, rgb);
    return rgb;
  };

  useEffect(() => {
    const onResize = () => {
      const compact = window.matchMedia("(max-width: 640px)").matches;
      setCellSize(compact ? 8 : 10);
      setGap(compact ? 1 : 2);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let raf = 0;
    const calc = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.getBoundingClientRect().width;
      setCols(Math.max(1, Math.floor((w + gap) / (cellSize + gap))));
    };
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(calc);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [cellSize, gap]);

  const totalCols = Math.max(1, Math.ceil(allDates.length / 7));
  const width = totalCols * (cellSize + gap) - gap;
  const height = 7 * (cellSize + gap) - gap;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < allDates.length; i++) {
      const date = allDates[i];
      const entry = logMap.get(date);
      const count = entry?.count ?? (entry ? 1 : 0);
      const intens = intensityByDate?.[date];
      const opacity =
        intens != null
          ? Math.min(1, Math.max(0, intens))
          : count <= 0
            ? 0.10
            : count >= target
              ? 1
              : 0.5;

      const cssColor = count <= 0 ? "hsl(var(--muted))" : colorsByDate?.[date] ?? accent;
      const rgb = resolve(cssColor);

      const col = Math.floor(i / 7);
      const row = i % 7;
      const x = col * (cellSize + gap);
      const y = row * (cellSize + gap);

      ctx.fillStyle = rgb.replace("rgb", "rgba").replace(")", `, ${opacity})`);
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }, [allDates, logMap, colorsByDate, accent, target, cellSize, gap, intensityByDate, width, height]);

  return (
    <div 
      ref={containerRef} 
      className="w-full"
      style={{ 
        contain: 'strict',
        contentVisibility: 'auto',
        containIntrinsicSize: '0 100px'
      }}
    >
      <canvas 
        ref={canvasRef} 
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          display: 'block',
          willChange: 'transform'
        }} 
      />
    </div>
  );
};

export default memo(Heatmap, (prev, next) => {
  if (prev.logs.length !== next.logs.length) return false;
  for (let i = 0; i < prev.logs.length; i++) {
    const p = prev.logs[i];
    const n = next.logs.find((l) => l.date === p.date && l.habitId === p.habitId);
    if (!n || p.count !== n.count || p.status !== n.status) return false;
  }
  return (
    prev.accent === next.accent &&
    prev.dailyTarget === next.dailyTarget &&
    prev.days === next.days
  );
});
