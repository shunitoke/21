"use client";

import type { Habit, Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteHabitDialogProps {
  habit: Habit | null;
  locale: Locale;
  onClose: () => void;
  onConfirm: (habitId: string) => void;
}

export function DeleteHabitDialog({ habit, locale, onClose, onConfirm }: DeleteHabitDialogProps) {
  return (
    <AlertDialog open={Boolean(habit)} onOpenChange={(value) => !value && onClose()}>
      <AlertDialogContent className="max-w-[420px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteConfirmTitle", locale)}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteConfirmDescription", locale)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{t("cancel", locale)}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => habit && onConfirm(habit.id)}
          >
            {t("delete", locale)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
