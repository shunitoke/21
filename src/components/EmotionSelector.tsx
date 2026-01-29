"use client";

import type { Locale } from "@/lib/types";
import { Button } from "@/components/ui/button";

const emotions = [
  { id: "спокойствие", ru: "Спокойствие", en: "Calm" },
  { id: "энергия", ru: "Энергия", en: "Energy" },
  { id: "благодарность", ru: "Благодарность", en: "Gratitude" },
  { id: "любовь", ru: "Любовь", en: "Love" },
  { id: "гордость", ru: "Гордость", en: "Pride" },
  { id: "уверенность", ru: "Уверенность", en: "Confidence" },
  { id: "фокус", ru: "Фокус", en: "Focus" },
  { id: "вдохновение", ru: "Вдохновение", en: "Inspiration" },
  { id: "тревога", ru: "Тревога", en: "Anxiety" },
  { id: "грусть", ru: "Грусть", en: "Sadness" },
];

interface EmotionSelectorProps {
  locale: Locale;
  selected: string[];
  onToggle: (id: string) => void;
}

const EmotionSelector = ({ locale, selected, onToggle }: EmotionSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {emotions.map((emotion) => (
        <Button
          key={emotion.id}
          type="button"
          size="xs"
          variant={selected.includes(emotion.id) ? "default" : "outline"}
          onClick={() => onToggle(emotion.id)}
        >
          {locale === "ru" ? emotion.ru : emotion.en}
        </Button>
      ))}
    </div>
  );
};

export default EmotionSelector;
