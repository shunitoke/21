"use client";

import { useState, useRef } from "react";
import type { Locale, UserSettings, Habit, HabitLog, JournalEntry, StopCraneItem } from "@/lib/types";
import { t } from "@/lib/i18n";
import { importEncryptedArchive, restoreMediaFiles } from "@/services/dataExport";
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

interface ImportDialogProps {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onImport: (data: { settings: UserSettings; habits: Habit[]; logs: HabitLog[]; journal: JournalEntry[]; stopCrane: StopCraneItem[] }) => void;
}

export function ImportDialog({ open, locale, onClose, onImport }: ImportDialogProps) {
  const [password, setPassword] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportFileName(file.name);
    setImportError(null);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!importFile || !password) return;
    try {
      const { data, media } = await importEncryptedArchive(importFile, password);
      onImport(data);
      await restoreMediaFiles(media);
      reset();
      onClose();
    } catch {
      setImportError(t("importError", locale));
    }
  };

  const reset = () => {
    setPassword("");
    setImportFile(null);
    setImportFileName(null);
    setImportError(null);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(value) => !value && handleCancel()}>
      <AlertDialogContent className="max-w-[420px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("importPasswordTitle", locale)}</AlertDialogTitle>
          <AlertDialogDescription>{t("importPasswordDescription", locale)}</AlertDialogDescription>
        </AlertDialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".p21"
          className="hidden"
          onChange={handleFileSelect}
        />

        {!importFile ? (
          <div className="py-4">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              {t("chooseFile", locale)}
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">{importFileName}</p>
            <Input
              type="password"
              placeholder={t("passwordPlaceholder", locale)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        {importError && <p className="text-xs text-destructive">{importError}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>{t("cancel", locale)}</AlertDialogCancel>
          <AlertDialogAction disabled={!password || !importFile} onClick={handleImport}>
            {t("import", locale)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
