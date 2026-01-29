"use client";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

const Heatmap = ({
  logs,
  accent,
  days = 196,
  dates,
  dailyTarget = 1,
  colorsByDate,
  intensityByDate,
}: HeatmapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [maxColumns, setMaxColumns] = useState<number | null>(null);
  const [cellSize, setCellSize] = useState(10);
  const [cellGap, setCellGap] = useState(2);

  useLayoutEffect(() => {
    const updateSizes = () => {
      const isCompact = window.matchMedia("(max-width: 640px)").matches;
      setCellSize(isCompact ? 8 : 10);
      setCellGap(isCompact ? 1 : 2);
    };
    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateColumns = () => {
      const width =
        containerRef.current?.parentElement?.getBoundingClientRect().width ??
        containerRef.current?.getBoundingClientRect().width ??
        0;
      const nextColumns = Math.max(1, Math.floor((width + cellGap) / (cellSize + cellGap)));
      setMaxColumns(nextColumns);
    };
    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [cellGap, cellSize]);

  const logMap = useMemo(() => {
    const map = new Map<string, HabitLog>();
    logs.forEach((log) => {
      map.set(log.date, log);
    });
    return map;
  }, [logs]);

  const responsiveDays = useMemo(() => {
    if (dates) return dates.length;
    const baseDays = Math.max(7, Math.floor(days / 7) * 7);
    const columns = Math.max(1, maxColumns ?? Math.ceil(baseDays / 7));
    const filledDays = Math.max(baseDays, columns * 7);
    return Math.max(7, Math.floor(filledDays / 7) * 7);
  }, [dates, days, maxColumns]);
  const resolvedDates = useMemo(() => (dates ? dates : getPastDays(responsiveDays)), [dates, responsiveDays]);
  const resolvedColumns = Math.max(1, Math.ceil(resolvedDates.length / 7));
  const target = Math.max(1, dailyTarget);
  const cells = useMemo(() => {
    return resolvedDates.map((date) => {
      const entry = logMap.get(date);
      const count = entry?.count ?? (entry ? 1 : 0);
      const intensity = intensityByDate?.[date];
      const opacity =
        intensity !== undefined && intensity !== null
          ? Math.min(1, Math.max(0, intensity))
          : count <= 0
            ? 0.55
            : count >= target
              ? 1
              : 0.5;
      const color = count <= 0 ? "hsl(var(--border) / 0.35)" : colorsByDate?.[date] ?? accent;
      return { key: date, opacity, color };
    });
  }, [accent, colorsByDate, intensityByDate, logMap, resolvedDates, target]);

  return (
    <div
      ref={containerRef}
      className="grid w-full max-w-full overflow-hidden"
      style={
        {
          gridAutoFlow: "column",
          gridTemplateRows: `repeat(7, ${cellSize}px)`,
          gridTemplateColumns: `repeat(${resolvedColumns}, ${cellSize}px)`,
          gap: `${cellGap}px`,
        } as CSSProperties
      }
    >
      {cells.map((cell) => (
        <span
          key={cell.key}
          className="rounded-sm"
          style={{ background: cell.color, opacity: cell.opacity, width: cellSize, height: cellSize }}
        />
      ))}
    </div>
  );
};

export default Heatmap;
