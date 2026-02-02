"use client";

import { useState } from "react";
import type { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { exportEncryptedArchive, downloadEncryptedArchive } from "@/services/dataExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface ExportDialogProps {
  open: boolean;
  locale: Locale;
  onClose: () => void;
}

export function ExportDialog({ open, locale, onClose }: ExportDialogProps) {
  const [password, setPassword] = useState("");

  const handleExport = async () => {
    try {
      const blob = await exportEncryptedArchive(password);
      downloadEncryptedArchive(blob);
      setPassword("");
      onClose();
    } catch {
      // Handle error silently
    }
  };

  const handleCancel = () => {
    setPassword("");
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(value) => !value && handleCancel()}>
      <AlertDialogContent className="max-w-[420px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("exportPasswordTitle", locale)}</AlertDialogTitle>
          <AlertDialogDescription>{t("exportPasswordDescription", locale)}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            type="password"
            placeholder={t("passwordPlaceholder", locale)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>{t("cancel", locale)}</AlertDialogCancel>
          <AlertDialogAction disabled={!password} onClick={handleExport}>
            {t("export", locale)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
