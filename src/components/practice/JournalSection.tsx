"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JournalToolbar } from "./JournalToolbar";
import { JournalTimeline } from "@/components/JournalEntryCard";
import { t } from "@/lib/i18n";
import type { JournalEntry, Locale } from "@/lib/types";

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

interface JournalSectionProps {
  journal: JournalEntry[];
  locale: Locale;
  onAddEntry: () => void;
  onDeleteEntry: (entry: JournalEntry) => void;
}

export function JournalSection({ journal, locale, onAddEntry, onDeleteEntry }: JournalSectionProps) {
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [collapsed, setCollapsed] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);

  const pageSize = 8;

  const filteredJournal = useMemo(
    () => filterJournalEntries(journal, dateFilterType, selectedEmotions, sortBy),
    [journal, dateFilterType, selectedEmotions, sortBy]
  );

  const pagedJournal = useMemo(() => filteredJournal.slice(0, visibleCount), [filteredJournal, visibleCount]);

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => prev + pageSize);
  }, []);

  const handleSortToggle = useCallback(() => {
    setSortBy((prev) => (prev === "newest" ? "oldest" : "newest"));
  }, []);

  const handleCollapsedToggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleFilterChange = useCallback((type: "all" | "today" | "week" | "month" | "year", emotions: string[]) => {
    setDateFilterType(type);
    setSelectedEmotions(emotions);
    setVisibleCount(pageSize);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("journal", locale)}</CardTitle>
          <Button size="sm" onClick={onAddEntry}>
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
            onOpenFilters={() => {}}
            onToggleSort={handleSortToggle}
            onToggleCollapsed={handleCollapsedToggle}
          />
        )}
        {journal.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEntriesYet", locale)}</p>
        ) : (
          <div className="pl-2" style={{ contain: "layout paint" }}>
            <JournalTimeline entries={pagedJournal} locale={locale} onDelete={onDeleteEntry} collapsed={collapsed} />
            {filteredJournal.length > visibleCount && (
              <div className="flex justify-center">
                <Button type="button" variant="outline" onClick={handleShowMore}>
                  {t("showMore", locale)}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
