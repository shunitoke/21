"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [showFilters, setShowFilters] = useState(false);

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

  const handleOpenFilters = useCallback(() => {
    setShowFilters(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setShowFilters(false);
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
            onOpenFilters={handleOpenFilters}
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
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("filter", locale)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("period", locale)}</label>
              <div className="flex flex-wrap gap-2">
                {(["all", "today", "week", "month", "year"] as const).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    size="xs"
                    variant={dateFilterType === type ? "default" : "outline"}
                    onClick={() => handleFilterChange(type, selectedEmotions)}
                  >
                    {t(type, locale)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("emotions", locale)}</label>
              <div className="flex flex-wrap gap-2">
                {["спокойствие", "энергия", "благодарность", "любовь", "гордость", "уверенность", "фокус", "вдохновение", "тревога", "грусть"].map((emotion) => (
                  <Button
                    key={emotion}
                    type="button"
                    size="xs"
                    variant={selectedEmotions.includes(emotion) ? "default" : "outline"}
                    onClick={() => {
                      const newEmotions = selectedEmotions.includes(emotion)
                        ? selectedEmotions.filter((e) => e !== emotion)
                        : [...selectedEmotions, emotion];
                      handleFilterChange(dateFilterType, newEmotions);
                    }}
                  >
                    {t(emotion, locale)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleFilterChange("all", [])}>
              {t("reset", locale)}
            </Button>
            <Button type="button" onClick={handleCloseFilters}>
              {t("apply", locale)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
