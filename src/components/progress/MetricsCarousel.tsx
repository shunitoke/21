"use client";

import { useState, useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Locale } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { CountUpValue } from "./CountUpValue";

interface Metric {
  id: string;
  title: string;
  value: number | string;
  badge: string;
  badgeDirection: "up" | "down";
  hint: string;
}

interface MetricsCarouselProps {
  metrics: Metric[];
  locale: Locale;
  isCompact: boolean;
  showSkeleton: boolean;
  animationKey: number;
  animationEnabled: boolean;
}

const metricCardVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      delay: index * 0.08,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

export function MetricsCarousel({
  metrics,
  locale,
  isCompact,
  showSkeleton,
  animationKey,
  animationEnabled,
}: MetricsCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);

  useEffect(() => {
    if (!api) return;
    const interval = window.setInterval(() => {
      if (document.querySelector('[data-slot="dialog-overlay"], [data-slot="alert-dialog-overlay"]')) return;
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [api]);

  return (
    <Carousel
      opts={{ align: "start", loop: true, watchDrag: false, watchSlides: false }}
      setApi={setApi}
      className="relative max-w-full overflow-hidden"
      style={{ touchAction: "pan-y", contain: "layout paint" }}
    >
      <CarouselContent className="max-w-full">
        {metrics.map((metric, index) => (
          <CarouselItem
            key={`${metric.title}-${index}`}
            className={isCompact ? "basis-full" : "basis-full sm:basis-1/2 lg:basis-1/3"}
          >
            <div className="h-full p-1">
              <motion.div
                custom={index}
                variants={metricCardVariants}
                initial="hidden"
                animate="show"
                className="h-full"
              >
                <div className={isCompact ? "h-full" : "h-full rounded-xl bg-card text-card-foreground"}>
                  <div className={`space-y-2 ${isCompact ? "" : "p-4"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.title}</p>
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        {metric.badgeDirection === "down" ? (
                          <TrendingDown className="size-3.5" />
                        ) : (
                          <TrendingUp className="size-3.5" />
                        )}
                        {metric.badge}
                      </Badge>
                    </div>
                    <div className="text-2xl font-semibold tabular-nums sm:text-3xl">
                      {showSkeleton ? (
                        <Skeleton className="h-7 w-20" />
                      ) : typeof metric.value === "number" ? (
                        <CountUpValue
                          key={`metric-${metric.id}-${animationKey}`}
                          value={metric.value}
                          enabled={animationEnabled}
                        />
                      ) : (
                        metric.value
                      )}
                    </div>
                  </div>
                  <div className={`flex flex-col items-start gap-1 text-xs ${isCompact ? "" : "px-4 pb-4"}`}>
                    <div className="line-clamp-1 flex items-center gap-1.5 font-semibold">
                      {metric.badgeDirection === "down"
                        ? locale === "ru"
                          ? "Нужно внимание"
                          : "Needs attention"
                        : locale === "ru"
                          ? "Хороший темп"
                          : "On a good pace"}
                      {metric.badgeDirection === "down" ? (
                        <TrendingDown className="size-3.5" />
                      ) : (
                        <TrendingUp className="size-3.5" />
                      )}
                    </div>
                    {showSkeleton ? (
                      <Skeleton className="h-3 w-28" />
                    ) : (
                      <div className="line-clamp-1 text-muted-foreground">{metric.hint}</div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

export type { Metric };
