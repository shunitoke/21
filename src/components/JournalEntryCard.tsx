"use client";

import { memo } from "react";
import { FileText, Mic, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { JournalEntry, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AudioAnchor from "@/components/AudioAnchor";

const emotionLabels: Record<string, { ru: string; en: string }> = {
  спокойствие: { ru: "Спокойствие", en: "Calm" },
  энергия: { ru: "Энергия", en: "Energy" },
  благодарность: { ru: "Благодарность", en: "Gratitude" },
  любовь: { ru: "Любовь", en: "Love" },
  гордость: { ru: "Гордость", en: "Pride" },
  уверенность: { ru: "Уверенность", en: "Confidence" },
  фокус: { ru: "Фокус", en: "Focus" },
  вдохновение: { ru: "Вдохновение", en: "Inspiration" },
  тревога: { ru: "Тревога", en: "Anxiety" },
  грусть: { ru: "Грусть", en: "Sadness" },
};

interface JournalEntryCardProps {
  entry: JournalEntry;
  locale: Locale;
  onDelete: (entry: JournalEntry) => void;
  isFirstOfDay?: boolean;
  isLastOfDay?: boolean;
  collapsed?: boolean;
}

const formatDate = (dateStr: string, locale: Locale) => {
  // Extract date part from ISO string to avoid timezone issues
  const datePart = dateStr.slice(0, 10); // "YYYY-MM-DD"
  const [year, month, day] = datePart.split("-").map(Number);
  
  // Create date from parts (month is 0-indexed in JS Date)
  const entryDate = new Date(year, month - 1, day);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const entryDateOnly = new Date(entryDate);
  entryDateOnly.setHours(0, 0, 0, 0);

  const isToday = entryDateOnly.getTime() === today.getTime();
  const isYesterday = entryDateOnly.getTime() === yesterday.getTime();

  if (isToday) return locale === "ru" ? "Сегодня" : "Today";
  if (isYesterday) return locale === "ru" ? "Вчера" : "Yesterday";

  // Include year for older dates
  const currentYear = today.getFullYear();
  const isCurrentYear = year === currentYear;
  
  if (locale === "ru") {
    const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", 
                       "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    return isCurrentYear 
      ? `${day} ${monthNames[month - 1]}` 
      : `${day} ${monthNames[month - 1]} ${year}`;
  }
  
  return isCurrentYear 
    ? entryDate.toLocaleDateString("en-US", { day: "numeric", month: "long" })
    : entryDate.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
};

const formatTime = (dateStr: string, timezoneOffset: number | undefined, locale: Locale) => {
  // Parse the UTC time from ISO string
  const date = new Date(dateStr);
  
  // If no timezoneOffset (old entries), use current browser timezone
  const offset = timezoneOffset ?? new Date().getTimezoneOffset();
  
  // Adjust for the timezone offset when the entry was created
  // timezoneOffset is in minutes (e.g., -180 for UTC+3)
  // We need to add this offset to get local time
  const localTime = new Date(date.getTime() - offset * 60000);
  
  return localTime.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const JournalEntryCard = memo(function JournalEntryCard({
  entry,
  locale,
  onDelete,
  isFirstOfDay = false,
  isLastOfDay = false,
  collapsed = false,
}: JournalEntryCardProps) {
  const isAudio = entry.type === "audio";

  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        {!isFirstOfDay && <div className="w-px h-3 bg-border" />}
        <motion.div 
          className="relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 border-muted bg-background"
          animate={{
            width: collapsed ? 24 : 32,
            height: collapsed ? 24 : 32,
            borderWidth: collapsed ? 1 : 2,
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {isAudio ? (
            <Mic className="text-muted-foreground" style={{ width: collapsed ? 12 : 14, height: collapsed ? 12 : 14 }} />
          ) : (
            <FileText className="text-muted-foreground" style={{ width: collapsed ? 12 : 14, height: collapsed ? 12 : 14 }} />
          )}
        </motion.div>
        {!isLastOfDay && <div className="w-px flex-1 bg-border min-h-[16px]" />}
      </div>

      <div className="flex-1 pb-4">
        <AnimatePresence>
          {isFirstOfDay && (
            <motion.div 
              className="mb-2 flex items-center gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {formatDate(entry.date, locale)}
              </span>
              <Separator className="flex-1" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex items-center gap-2 py-1"
            >
              <span className="text-xs text-muted-foreground">
                {formatTime(entry.date, entry.timezoneOffset, locale)}
              </span>
              {entry.emotions && entry.emotions.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {entry.emotions.length} {locale === "ru" ? "эмоций" : "emotions"}
                </span>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >

        <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-muted-foreground font-medium">
                  {formatTime(entry.date, entry.timezoneOffset, locale)}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onDelete(entry)}
                aria-label={t("delete", locale)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {isAudio && (
              <div className="mt-3">
                <AudioAnchor src={entry.content} locale={locale} />
              </div>
            )}

            {isAudio && entry.textContent ? (
              <p className="mt-3 text-sm leading-snug break-words">{entry.textContent}</p>
            ) : !isAudio ? (
              <p className="mt-3 text-sm leading-snug break-words">{entry.content}</p>
            ) : null}

            {entry.emotions?.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {entry.emotions.map((emotion) => {
                  const label = emotionLabels[emotion] ?? { ru: emotion, en: emotion };
                  return (
                    <Badge key={emotion} variant="secondary" className="text-[11px] font-semibold">
                      {locale === "ru" ? label.ru : label.en}
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

interface JournalTimelineProps {
  entries: JournalEntry[];
  locale: Locale;
  onDelete: (entry: JournalEntry) => void;
  collapsed?: boolean;
}

export function JournalTimeline({ entries, locale, onDelete, collapsed = false }: JournalTimelineProps) {
  if (entries.length === 0) return null;

  const grouped = entries.reduce((acc, entry) => {
    const dateObj = new Date(entry.date);
    dateObj.setHours(0, 0, 0, 0);
    const dateKey = dateObj.toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, JournalEntry[]>);

  const dateGroups = Object.entries(grouped);

  return (
    <div className="space-y-0">
      {dateGroups.map(([dateKey, dayEntries], groupIndex) => (
        <div key={dateKey}>
          {dayEntries.map((entry, entryIndex) => {
            const isFirstOfDay = entryIndex === 0;
            const isLastOfDay = entryIndex === dayEntries.length - 1;
            const isLastEntry = groupIndex === dateGroups.length - 1 && isLastOfDay;

            return (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                locale={locale}
                onDelete={onDelete}
                isFirstOfDay={isFirstOfDay}
                isLastOfDay={isLastEntry || !isLastOfDay}
                collapsed={collapsed}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default JournalEntryCard;
