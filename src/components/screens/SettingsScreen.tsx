"use client";

import { useRef, useState } from "react";
import { Archive, Download, Globe, Heart, Lock, Moon, Sun, Upload } from "lucide-react";
import type { Habit, HabitLog, JournalEntry, Locale, StopCraneItem, UserSettings } from "@/lib/types";
import { t } from "@/lib/i18n";
import { exportEncryptedArchive, downloadEncryptedArchive, importEncryptedArchive, restoreMediaFiles } from "@/services/dataExport";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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

interface SettingsScreenProps {
  locale: Locale;
  settings: UserSettings;
  habits: Habit[];
  onUpdate: (settings: Partial<UserSettings>) => void;
  onRestore: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onImportData?: (data: { settings: UserSettings; habits: Habit[]; logs: HabitLog[]; journal: JournalEntry[]; stopCrane: StopCraneItem[] }) => void;
}

const SettingsScreen = ({ locale, settings, habits, onUpdate, onRestore, onDelete, onImportData }: SettingsScreenProps) => {
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportPasswordOpen, setExportPasswordOpen] = useState(false);
  const [importPasswordOpen, setImportPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const archivedHabits = habits.filter((habit) => habit.archived);

  return (
    <div className="grid gap-3">
      <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
        <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Sun size={16} />
                <span>{t("appearance", locale)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={settings.theme === "system" ? "default" : "outline"}
                  onClick={() => onUpdate({ theme: "system" })}
                >
                  {t("themeSystem", locale)}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={settings.theme === "light" ? "default" : "outline"}
                  onClick={() => onUpdate({ theme: "light" })}
                >
                  {t("themeLight", locale)}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={settings.theme === "dark" ? "default" : "outline"}
                  onClick={() => onUpdate({ theme: "dark" })}
                >
                  {t("themeDark", locale)}
                </Button>
              </div>
        </CardContent>
      </Card>

      <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
        <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Globe size={16} />
                <span>{t("language", locale)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={settings.locale === "ru" ? "default" : "outline"}
                  onClick={() => onUpdate({ locale: "ru" })}
                >
                  Русский
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={settings.locale === "en" ? "default" : "outline"}
                  onClick={() => onUpdate({ locale: "en" })}
                >
                  English
                </Button>
              </div>
        </CardContent>
      </Card>

      <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
        <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Heart size={16} />
                <span>{t("assistant", locale)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={settings.ally === "friend" ? "default" : "outline"}
                  onClick={() => onUpdate({ ally: "friend" })}
                >
                  {t("allyFriend", locale)}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={settings.ally === "coach" ? "default" : "outline"}
                  onClick={() => onUpdate({ ally: "coach" })}
                >
                  {t("allyCoach", locale)}
                </Button>
              </div>
        </CardContent>
      </Card>

      <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
        <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Moon size={16} />
                  <span>{t("demoMode", locale)}</span>
                </div>
                <Switch checked={Boolean(settings.demoMode)} onCheckedChange={(checked) => onUpdate({ demoMode: checked })} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("demoModeHint", locale)}</p>
        </CardContent>
      </Card>

      <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
        <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Archive size={16} />
                  <span>{t("archivedHabits", locale)}</span>
                </div>
                <Button size="xs" variant="outline" type="button" onClick={() => setArchivedOpen(!archivedOpen)}>
                  {archivedOpen ? "-" : "+"}
                </Button>
              </div>
              {archivedOpen && (
                <div className="mt-3 grid gap-2">
                  {archivedHabits.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("emptyHabits", locale)}</p>
                  ) : (
                    archivedHabits.map((habit) => (
                      <Card key={habit.id} className="p-3 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: habit.colorToken }}>
                              {habit.name}
                            </p>
                            {habit.description && (
                              <p className="text-xs text-muted-foreground">{habit.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="xs" variant="outline" onClick={() => onRestore(habit.id)}>
                              {t("restore", locale)}
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => setDeleteTarget(habit)}
                            >
                              {t("delete", locale)}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
        </CardContent>
      </Card>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(value: boolean) => (!value ? setDeleteTarget(null) : null)}>
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle", locale)}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription", locale)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", locale)}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {t("delete", locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <Lock size={16} />
            <span>{t("exportData", locale)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("exportDataHint", locale)}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setExportPasswordOpen(true)}
          >
            <Download size={14} className="mr-2" />
            {t("exportData", locale)}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={exportPasswordOpen} onOpenChange={setExportPasswordOpen}>
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
            <AlertDialogCancel onClick={() => { setPassword(""); setExportPasswordOpen(false); }}>
              {t("cancel", locale)}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!password}
              onClick={async () => {
                try {
                  const blob = await exportEncryptedArchive(password);
                  downloadEncryptedArchive(blob);
                  setPassword("");
                  setExportPasswordOpen(false);
                } catch {
                  // Handle error
                }
              }}
            >
              {t("export", locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <Upload size={16} />
            <span>{t("importData", locale)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("importDataHint", locale)}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".p21"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !onImportData) return;
              setImportFile(file);
              setImportPasswordOpen(true);
              e.target.value = "";
            }}
          />
          {importError && (
            <p className="mt-2 text-xs text-destructive">{importError}</p>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} className="mr-2" />
            {t("importData", locale)}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={importPasswordOpen} onOpenChange={setImportPasswordOpen}>
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("importPasswordTitle", locale)}</AlertDialogTitle>
            <AlertDialogDescription>{t("importPasswordDescription", locale)}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder={t("passwordPlaceholder", locale)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {importError && (
            <p className="mb-4 text-xs text-destructive">{importError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPassword(""); setImportPasswordOpen(false); setImportFile(null); setImportError(null); }}>
              {t("cancel", locale)}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!password || !importFile}
              onClick={async () => {
                if (!importFile) return;
                try {
                  const { data, media } = await importEncryptedArchive(importFile, password);
                  onImportData?.(data);
                  await restoreMediaFiles(media);
                  setPassword("");
                  setImportPasswordOpen(false);
                  setImportFile(null);
                  setImportError(null);
                } catch (error) {
                  setImportError(t("importError", locale));
                }
              }}
            >
              {t("import", locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="pt-2 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        0.957
      </div>
    </div>
  );
};

export default SettingsScreen;
