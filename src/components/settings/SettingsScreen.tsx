"use client";

import { useRef, useState } from "react";
import { Archive, Bell, Download, Globe, Heart, Lock, Moon, Send, Sun, Upload } from "lucide-react";
import type { Habit, HabitLog, JournalEntry, Locale, NotificationSettings, StopCraneItem, UserSettings } from "@/lib/types";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SettingCard } from "./SettingCard";
import { SettingGroup } from "./SettingGroup";
import { SettingButtonGroup } from "./SettingButtonGroup";
import { DeleteHabitDialog } from "./dialogs/DeleteHabitDialog";
import { ExportDialog } from "./dialogs/ExportDialog";
import { ImportDialog } from "./dialogs/ImportDialog";

interface SettingsScreenProps {
  locale: Locale;
  settings: UserSettings;
  habits: Habit[];
  appVersion?: string;
  onUpdate: (settings: Partial<UserSettings>) => void;
  onRestore: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onImportData?: (data: { settings: UserSettings; habits: Habit[]; logs: HabitLog[]; journal: JournalEntry[]; stopCrane: StopCraneItem[] }) => void;
}

export default function SettingsScreen({
  locale,
  settings,
  habits,
  appVersion,
  onUpdate,
  onRestore,
  onDelete,
  onImportData,
}: SettingsScreenProps) {
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const archivedHabits = habits.filter((habit) => habit.archived);

  const notificationSettings: NotificationSettings = settings.notificationSettings ?? {
    enabled: false,
    frequency: "normal",
    startHour: 9,
    endHour: 22,
  };

  const handleNotificationUpdate = (updates: Partial<NotificationSettings>) => {
    onUpdate({ notificationSettings: { ...notificationSettings, ...updates } });
  };

  return (
    <div className="space-y-6">
      {/* Personalization */}
      <SettingGroup title={locale === "ru" ? "Персонализация" : "Personalization"}>
        <SettingCard
          icon={Sun}
          title={t("appearance", locale)}
          description={locale === "ru" ? "Выберите тему оформления" : "Choose app theme"}
        >
          <SettingButtonGroup
            options={[
              { value: "system", label: t("themeSystem", locale) },
              { value: "light", label: t("themeLight", locale) },
              { value: "dark", label: t("themeDark", locale) },
            ]}
            value={settings.theme}
            onChange={(theme) => onUpdate({ theme })}
          />
        </SettingCard>

        <SettingCard
          icon={Globe}
          title={t("language", locale)}
        >
          <SettingButtonGroup
            options={[
              { value: "ru", label: "Русский" },
              { value: "en", label: "English" },
            ]}
            value={settings.locale}
            onChange={(locale) => onUpdate({ locale })}
          />
        </SettingCard>

        <SettingCard
          icon={Heart}
          title={t("assistant", locale)}
          description={locale === "ru" ? "Стиль напоминаний и поддержки" : "Reminder and support style"}
        >
          <SettingButtonGroup
            options={[
              { value: "friend", label: t("allyFriend", locale) },
              { value: "coach", label: t("allyCoach", locale) },
            ]}
            value={settings.ally}
            onChange={(ally) => onUpdate({ ally })}
          />
        </SettingCard>
      </SettingGroup>

      {/* App */}
      <SettingGroup title={locale === "ru" ? "Приложение" : "App"}>
        <SettingCard
          icon={Moon}
          title={t("demoMode", locale)}
          description={t("demoModeHint", locale)}
          action={
            <Switch
              checked={Boolean(settings.demoMode)}
              onCheckedChange={(demoMode) => onUpdate({ demoMode })}
            />
          }
        />

        <SettingCard
          icon={Bell}
          title={t("notifications", locale)}
          description={t("notificationsHint", locale)}
          action={
            <Switch
              checked={notificationSettings.enabled}
              onCheckedChange={(enabled) => handleNotificationUpdate({ enabled })}
            />
          }
        >
          {notificationSettings.enabled && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t("notificationFrequency", locale)}</p>
                <SettingButtonGroup
                  options={[
                    { value: "rare", label: t("notificationFrequencyRare", locale) },
                    { value: "normal", label: t("notificationFrequencyNormal", locale) },
                    { value: "persistent", label: t("notificationFrequencyPersistent", locale) },
                  ]}
                  value={notificationSettings.frequency}
                  onChange={(frequency) => handleNotificationUpdate({ frequency })}
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">{t("notificationTimeWindow", locale)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{t("notificationFrom", locale)}</span>
                  <Input
                    type="number"
                    min={0}
                    max={22}
                    value={notificationSettings.startHour}
                    onChange={(e) => {
                      const newStart = Math.min(22, Math.max(0, parseInt(e.target.value) || 0));
                      const newEnd = newStart >= notificationSettings.endHour ? newStart + 1 : notificationSettings.endHour;
                      handleNotificationUpdate({ startHour: newStart, endHour: newEnd });
                    }}
                    className="w-16 h-8 text-sm"
                  />
                  <span className="text-xs">{t("notificationTo", locale)}</span>
                  <Input
                    type="number"
                    min={1}
                    max={23}
                    value={notificationSettings.endHour}
                    onChange={(e) => {
                      const newEnd = Math.min(23, Math.max(1, parseInt(e.target.value) || 1));
                      const newStart = newEnd <= notificationSettings.startHour ? newEnd - 1 : notificationSettings.startHour;
                      handleNotificationUpdate({ startHour: newStart, endHour: newEnd });
                    }}
                    className="w-16 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </SettingCard>
      </SettingGroup>

      {/* Data */}
      <SettingGroup title={locale === "ru" ? "Данные" : "Data"}>
        {/* Archived Habits */}
        <Card className="transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Archive size={16} />
                <span>{t("archivedHabits", locale)}</span>
              </div>
              <Button size="xs" variant="outline" onClick={() => setArchivedOpen(!archivedOpen)}>
                {archivedOpen ? "−" : "+"}
              </Button>
            </div>

            {archivedOpen && (
              <div className="mt-3 grid gap-2">
                {archivedHabits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("emptyHabits", locale)}</p>
                ) : (
                  archivedHabits.map((habit) => (
                    <Card key={habit.id} className="p-3">
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
                          <Button size="xs" variant="destructive" onClick={() => setDeleteTarget(habit)}>
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

        <SettingCard
          icon={Lock}
          title={t("exportData", locale)}
          description={t("exportDataHint", locale)}
        >
          <Button type="button" size="sm" variant="outline" onClick={() => setExportOpen(true)}>
            <Download size={14} className="mr-2" />
            {t("exportData", locale)}
          </Button>
        </SettingCard>

        <SettingCard
          icon={Upload}
          title={t("importData", locale)}
          description={t("importDataHint", locale)}
        >
          <Button type="button" size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload size={14} className="mr-2" />
            {t("importData", locale)}
          </Button>
        </SettingCard>
      </SettingGroup>

      {/* Support */}
      <SettingGroup title={locale === "ru" ? "Поддержка" : "Support"}>
        <SettingCard
          icon={Send}
          title={t("community", locale)}
          description={t("communityHint", locale)}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.open("https://t.me/prokachayprogram21", "_blank")}
          >
            <Send size={14} className="mr-2" />
            {t("joinCommunity", locale)}
          </Button>
        </SettingCard>
      </SettingGroup>

      {/* Version */}
      <div className="pt-2 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {appVersion || "0.1.0"}
      </div>

      {/* Dialogs */}
      <DeleteHabitDialog
        habit={deleteTarget}
        locale={locale}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(id) => {
          onDelete(id);
          setDeleteTarget(null);
        }}
      />

      <ExportDialog open={exportOpen} locale={locale} onClose={() => setExportOpen(false)} />

      {onImportData && (
        <ImportDialog
          open={importOpen}
          locale={locale}
          onClose={() => setImportOpen(false)}
          onImport={onImportData}
        />
      )}
    </div>
  );
}
