"use client";

import { useCountUp } from "@/hooks/useProgressMetrics";

interface CountUpValueProps {
  value: number;
  suffix?: string;
  enabled?: boolean;
}

export function CountUpValue({ value, suffix, enabled = true }: CountUpValueProps) {
  const animated = useCountUp(value, 900, enabled);
  return (
    <span className="tabular-nums">
      {animated.toLocaleString()}
      {suffix ?? ""}
    </span>
  );
}
