"use client";

import { useMemo } from "react";
import type { ReactElement } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { JournalEntry, Locale } from "@/lib/types";
import { weekdaysShort } from "@/lib/calendar";
import { t } from "@/lib/i18n";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { NotebookPen } from "lucide-react";

interface ChartPoint {
  label: string;
  date: string;
  entries: JournalEntry[];
  marker: number;
  [key: string]: number | string | JournalEntry[];
}

interface ProgressChartProps {
  data: ChartPoint[];
  locale: Locale;
  chartMode: "week" | "month" | "year";
  seriesIds: string[];
  chartConfig: Record<string, { label: string; color: string }>;
  showJournalEntries: boolean;
  onSelectEntries: (entries: JournalEntry[]) => void;
}

const renderJournalIcon = (cx: number, cy: number, entries: JournalEntry[], onClick?: (entries: JournalEntry[]) => void) => (
  <g
    transform={`translate(${cx - 9}, ${cy - 18})`}
    style={{ cursor: "pointer" }}
    onClick={() => entries && onClick?.(entries)}
  >
    <rect x={0} y={0} width={18} height={18} rx={9} fill="hsl(var(--primary))" stroke="hsl(var(--border))" />
    <g transform="translate(3, 3)">
      <NotebookPen size={12} color="hsl(var(--primary-foreground))" />
    </g>
  </g>
);

export function ProgressChart({
  data,
  locale,
  chartMode,
  seriesIds,
  chartConfig,
  showJournalEntries,
  onSelectEntries,
}: ProgressChartProps) {
  const dataWithHandlers = useMemo(
    () => data.map((point) => ({ ...point, onClick: onSelectEntries })),
    [data, onSelectEntries]
  );

  const getDotRenderer = (seriesId: string) => {
    return (props: unknown): ReactElement<SVGElement> => {
      const dot = props as {
        cx?: number;
        cy?: number;
        payload?: (Record<string, unknown> & {
          date?: string;
          entries?: JournalEntry[];
          onClick?: (entries: JournalEntry[]) => void;
        }) | null;
        active?: boolean;
      };

      if (dot.cx == null || dot.cy == null || !dot.payload) {
        return <circle cx={0} cy={0} r={0} fill="transparent" />;
      }
      const entries = dot.payload.entries ?? [];
      const key = `${dot.payload.date ?? "unknown"}-${seriesId}`;

      const bestSeriesId = (() => {
        let bestId = seriesIds[0] ?? "all";
        let bestValue = Number((dot.payload as Record<string, unknown>)[bestId] ?? 0);
        seriesIds.forEach((id) => {
          const value = Number((dot.payload as Record<string, unknown>)[id] ?? 0);
          if (value > bestValue) {
            bestValue = value;
            bestId = id;
          }
        });
        return bestId;
      })();

      if (showJournalEntries && entries.length) {
        if (seriesId !== bestSeriesId) {
          return <circle key={key} cx={dot.cx} cy={dot.cy} r={0} fill="transparent" />;
        }
        return (
          <g key={key}>{renderJournalIcon(dot.cx, dot.cy, entries, dot.payload.onClick)}</g>
        );
      }

      return (
        <circle
          key={key}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.active ? 5 : 3.5}
          fill={`var(--color-${seriesId})`}
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
      );
    };
  };

  const renderTooltip = (props: TooltipProps<number, string>) => {
    const { active, label, payload } = props;
    if (!active || !payload?.length) return null;

    const entriesCount = (payload?.[0]?.payload as { entries?: JournalEntry[] } | undefined)?.entries?.length ?? 0;
    const labelText = typeof label === "string" ? label : "";

    return (
      <div className="border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
        {labelText ? <div className="font-medium">{labelText}</div> : null}
        <div className="grid gap-1.5">
          {payload
            .filter((item) => item.dataKey && item.value != null)
            .map((item) => {
              const id = String(item.dataKey ?? item.name ?? "value");
              const cfg = chartConfig[id];
              return (
                <div key={id} className="flex w-full items-center gap-2">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: item.color ?? cfg?.color }} />
                  <div className="flex flex-1 justify-between leading-none">
                    <span className="text-muted-foreground">{cfg?.label ?? id}</span>
                    <span className="text-foreground font-mono font-medium tabular-nums">
                      {Number(item.value).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          {entriesCount > 0 && (
            <div className="flex w-full items-center gap-2">
              <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: "hsl(var(--primary))" }} />
              <div className="flex flex-1 justify-between leading-none">
                <span className="text-muted-foreground">{locale === "ru" ? "Записей журнала" : "Journal entries"}</span>
                <span className="text-foreground font-mono font-medium tabular-nums">{entriesCount.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden" style={{ touchAction: "pan-y", contain: "layout paint" }}>
      <ChartContainer config={chartConfig} className="h-[200px] w-full" style={{ touchAction: "pan-y" }}>
        <ComposedChart data={dataWithHandlers} margin={{ top: 28, left: 12, right: 12, bottom: 6 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis hide domain={[0, (dataMax: number) => Math.max(1, dataMax + 3)]} />
          <ChartTooltip cursor={false} content={renderTooltip} />
          {seriesIds.map((seriesId) => (
            <Area
              key={seriesId}
              dataKey={seriesId}
              type="monotone"
              fill={`var(--color-${seriesId})`}
              fillOpacity={seriesIds.length > 1 ? 0.08 : 0.25}
              stroke={`var(--color-${seriesId})`}
              strokeWidth={2}
              dot={getDotRenderer(seriesId)}
              activeDot={getDotRenderer(seriesId)}
              isAnimationActive
              animationBegin={0}
              animationDuration={650}
            />
          ))}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

export type { ChartPoint };
