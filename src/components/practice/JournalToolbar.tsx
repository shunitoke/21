"use client";

import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

interface JournalToolbarProps {
  locale: Locale;
  dateFilterType: "all" | "today" | "week" | "month" | "year";
  selectedEmotions: string[];
  sortBy: "newest" | "oldest";
  collapsed: boolean;
  onOpenFilters: () => void;
  onToggleSort: () => void;
  onToggleCollapsed: () => void;
}

export function JournalToolbar({
  locale,
  dateFilterType,
  selectedEmotions,
  sortBy,
  collapsed,
  onOpenFilters,
  onToggleSort,
  onToggleCollapsed,
}: JournalToolbarProps) {
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
}
