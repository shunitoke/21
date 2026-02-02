"use client";

import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Achievement, Habit, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";

const achievementGlyphs: Record<string, string> = {
  "achievement-first-habit": "🌱",
  "achievement-five-habits": "🌿",
  "achievement-all-categories": "🌍",
  "achievement-priority-five": "🎯",
  "achievement-first-entry": "📝",
  "achievement-week-journal": "📓",
  "achievement-month-journal": "📚",
  "achievement-audio-master": "🎙️",
  "achievement-first-steps": "🌟",
  "achievement-consistent": "💪",
  "achievement-hundred": "🎖️",
  "achievement-dedicated": "🏅",
  "achievement-master": "🏆",
  "achievement-365": "🌈",
};

const achievementGroupOrder = ["priority", "habit", "app", "journal", "discipline"] as const;
type AchievementGroup = (typeof achievementGroupOrder)[number];

interface AchievementsSectionProps {
  achievements: Achievement[];
  habits: Habit[];
  locale: Locale;
}

const getAchievementBadge = (achievement: Achievement, locale: Locale) => {
  const isLegendary =
    achievement.id === "achievement-365" ||
    achievement.id === "achievement-master" ||
    achievement.id.includes("legendary");
  const isRare = achievement.id.includes("rare") || isLegendary;
  return {
    show: achievement.habitId ? isRare : false,
    isLegendary,
    label: isLegendary ? t("legendaryAchievement", locale) : t("rareAchievement", locale),
    variant: isLegendary ? ("default" as const) : ("secondary" as const),
  };
};

const AchievementCard = ({ achievement, locale }: { achievement: Achievement; locale: Locale }) => {
  const badge = getAchievementBadge(achievement, locale);

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">{achievementGlyphs[achievement.id] ?? "⭐"}</span>
        <div className="grid gap-1">
          <p className="text-sm font-semibold">{achievement.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            {badge.show && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>
        </div>
      </div>
      {achievement.dateUnlocked && (
        <span className="text-xs text-muted-foreground">
          {new Date(achievement.dateUnlocked).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      )}
    </div>
  );
};

const AchievementGroup = ({
  title,
  achievements,
  locale,
}: {
  title: string;
  achievements: Achievement[];
  locale: Locale;
}) => (
  <div className="grid gap-3">
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
    <div className="grid gap-4">
      {achievements.map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} locale={locale} />
      ))}
    </div>
  </div>
);

export function AchievementsSection({ achievements, habits, locale }: AchievementsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const maxAchievements = 4;

  const habitsById = useMemo(() => new Map(habits.map((habit) => [habit.id, habit])), [habits]);
  const unlockedAchievements = useMemo(() => achievements.filter((a) => a.unlocked), [achievements]);

  const getAchievementGroup = useCallback(
    (achievement: Achievement): AchievementGroup => {
      if (achievement.habitId) {
        const habit = habitsById.get(achievement.habitId);
        return habit?.isPriority ? "priority" : "habit";
      }
      if (
        achievement.id === "achievement-first-habit" ||
        achievement.id === "achievement-five-habits" ||
        achievement.id === "achievement-all-categories" ||
        achievement.id === "achievement-priority-five"
      ) {
        return "app";
      }
      if (
        achievement.id === "achievement-first-entry" ||
        achievement.id === "achievement-week-journal" ||
        achievement.id === "achievement-month-journal" ||
        achievement.id === "achievement-audio-master"
      ) {
        return "journal";
      }
      return "discipline";
    },
    [habitsById]
  );

  const getAchievementTier = useCallback((achievement: Achievement) => {
    if (achievement.id.includes("legendary")) return 3;
    if (achievement.id.includes("rare")) return 2;
    return 1;
  }, []);

  const getAchievementScore = useCallback((achievement: Achievement) => {
    const match = achievement.name.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }, []);

  const groupedAchievements = useMemo(() => {
    const groups: Record<AchievementGroup, Achievement[]> = {
      priority: [],
      habit: [],
      app: [],
      journal: [],
      discipline: [],
    };
    unlockedAchievements.forEach((achievement) => {
      groups[getAchievementGroup(achievement)].push(achievement);
    });
    achievementGroupOrder.forEach((group) => {
      groups[group].sort((a, b) => {
        const tierDiff = getAchievementTier(b) - getAchievementTier(a);
        if (tierDiff !== 0) return tierDiff;
        const scoreDiff = getAchievementScore(b) - getAchievementScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        return a.name.localeCompare(b.name, locale === "ru" ? "ru" : "en");
      });
    });
    return groups;
  }, [getAchievementGroup, getAchievementScore, getAchievementTier, locale, unlockedAchievements]);

  const flatGrouped = useMemo(
    () => achievementGroupOrder.flatMap((group) => groupedAchievements[group]),
    [groupedAchievements]
  );

  const visibleAchievements = showAll ? flatGrouped : flatGrouped.slice(0, maxAchievements);

  const groupLabels: Record<AchievementGroup, string> = {
    priority: t("achievementsPriorityHabits", locale),
    habit: t("achievementsHabits", locale),
    app: t("achievementsApp", locale),
    journal: t("achievementsJournal", locale),
    discipline: t("achievementsDiscipline", locale),
  };

  const visibleBuckets = useMemo<Record<AchievementGroup, Achievement[]>>(() => {
    if (showAll) return groupedAchievements;
    const remaining = new Map<AchievementGroup, number>();
    achievementGroupOrder.forEach((group) => remaining.set(group, groupedAchievements[group].length));
    const bucket: Record<AchievementGroup, Achievement[]> = {
      priority: [],
      habit: [],
      app: [],
      journal: [],
      discipline: [],
    };
    visibleAchievements.forEach((achievement) => {
      const group = getAchievementGroup(achievement);
      if ((remaining.get(group) ?? 0) <= 0) return;
      bucket[group].push(achievement);
      remaining.set(group, (remaining.get(group) ?? 0) - 1);
    });
    return bucket;
  }, [getAchievementGroup, groupedAchievements, showAll, visibleAchievements]);

  if (unlockedAchievements.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("noUnlockedAchievements", locale)}</p>;
  }

  return (
    <Collapsible open={showAll} onOpenChange={setShowAll}>
      <div className="grid gap-4" style={{ contain: "layout" }}>
        {achievementGroupOrder.map((group) => {
          const items = visibleBuckets[group];
          if (!items?.length) return null;
          return <AchievementGroup key={group} title={groupLabels[group]} achievements={items} locale={locale} />;
        })}
      </div>
      {unlockedAchievements.length > maxAchievements && (
        <div
          className="mt-3 flex justify-center overflow-hidden"
          style={{ width: "100%", maxWidth: "100vw", overflow: "hidden", boxSizing: "border-box", minWidth: "0", flexShrink: "1", flexBasis: "0" }}
        >
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline">
              {showAll ? t("collapseAll", locale) : t("showMore", locale)}
            </Button>
          </CollapsibleTrigger>
        </div>
      )}
    </Collapsible>
  );
}
