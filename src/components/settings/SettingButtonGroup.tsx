"use client";

import { Button } from "@/components/ui/button";

interface Option<T> {
  value: T;
  label: string;
}

interface SettingButtonGroupProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SettingButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: SettingButtonGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? "default" : "outline"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
