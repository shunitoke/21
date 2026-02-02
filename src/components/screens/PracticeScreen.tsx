"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import type { JournalEntry, Locale, StopCraneItem } from "@/lib/types";
import { t } from "@/lib/i18n";
import { StopCraneGrid } from "@/components/practice/StopCraneGrid";
import { JournalSection } from "@/components/practice/JournalSection";
import { BreathingDialog } from "@/components/practice/BreathingDialog";
import { ImagePreviewDialog } from "@/components/practice/ImagePreviewDialog";

const AnchorModal = dynamic(() => import("@/components/AnchorModal"), { ssr: false });
const JournalModal = dynamic(() => import("@/components/JournalModal"), { ssr: false });

interface PracticeScreenProps {
  locale: Locale;
  journal: JournalEntry[];
  stopCrane: StopCraneItem[];
  onAddStopCrane: (item: StopCraneItem) => void;
  onRemoveStopCrane: (id: string) => void;
  onReorderStopCrane: (items: StopCraneItem[]) => void;
  onAddJournal: (entry: JournalEntry) => void;
  onRemoveJournal: (id: string) => void;
  radioSrc: string | null;
  radioPlaying: boolean;
  radioBuffering: boolean;
  onToggleRadio: (src: string) => void;
  isActive?: boolean;
}

const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));
  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);
  return isVisible;
};

export default function PracticeScreen({
  locale,
  journal,
  stopCrane,
  onAddStopCrane,
  onRemoveStopCrane,
  onReorderStopCrane,
  onAddJournal,
  onRemoveJournal,
  radioSrc,
  radioPlaying,
  radioBuffering,
  onToggleRadio,
  isActive = true,
}: PracticeScreenProps) {
  const isPageVisible = usePageVisibility();
  const [anchorModalOpen, setAnchorModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [breathingOpen, setBreathingOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [expandedText, setExpandedText] = useState<string | null>(null);
  const [anchorToDelete, setAnchorToDelete] = useState<StopCraneItem | null>(null);
  const [journalToDelete, setJournalToDelete] = useState<JournalEntry | null>(null);
  const [imageThumbs, setImageThumbs] = useState<Record<string, string>>({});
  const [anchorWobbleActive, setAnchorWobbleActive] = useState(false);
  const wobbleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadThumbnail = async (id: string, src: string) => {
      if (imageThumbs[id]) return;
      try {
        const img = new Image();
        img.decoding = "async";
        img.crossOrigin = "anonymous";
        img.src = src;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image load failed"));
        });
        const maxSize = 240;
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.drawImage(img, 0, 0, width, height);
        const thumb = canvas.toDataURL("image/jpeg", 0.72);
        if (!cancelled) {
          setImageThumbs((prev) => (prev[id] ? prev : { ...prev, [id]: thumb }));
        }
      } catch {
        if (!cancelled) {
          setImageThumbs((prev) => (prev[id] ? prev : { ...prev, [id]: src }));
        }
      }
    };

    stopCrane
      .filter((item) => item.type === "image")
      .forEach((item) => {
        void loadThumbnail(item.id, item.content);
      });

    return () => {
      cancelled = true;
    };
  }, [stopCrane, imageThumbs]);

  useEffect(() => {
    if (!isActive) return;
    if (wobbleTimeoutRef.current) window.clearTimeout(wobbleTimeoutRef.current);
    setAnchorWobbleActive(true);
    wobbleTimeoutRef.current = window.setTimeout(() => {
      setAnchorWobbleActive(false);
      wobbleTimeoutRef.current = null;
    }, 360);
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (wobbleTimeoutRef.current) window.clearTimeout(wobbleTimeoutRef.current);
    };
  }, []);

  const handleTextExpand = (content: string) => {
    setExpandedText(content);
    setTextModalOpen(true);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("anchors", locale)}</CardTitle>
            <Button size="sm" onClick={() => setAnchorModalOpen(true)}>
              {t("newStopCrane", locale)}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-0 sm:px-6">
          <StopCraneGrid
            items={stopCrane}
            locale={locale}
            imageThumbs={imageThumbs}
            onReorder={onReorderStopCrane}
            onDelete={setAnchorToDelete}
            onImagePreview={setImagePreview}
            onTextExpand={handleTextExpand}
            onStartBreathing={() => setBreathingOpen(true)}
            radioSrc={radioSrc}
            radioPlaying={radioPlaying}
            radioBuffering={radioBuffering}
            onToggleRadio={onToggleRadio}
            wobbleActive={anchorWobbleActive}
          />
        </CardContent>
      </Card>

      <JournalSection
        journal={journal}
        locale={locale}
        onAddEntry={() => setJournalModalOpen(true)}
        onDeleteEntry={setJournalToDelete}
      />

      <Dialog
        open={textModalOpen}
        onOpenChange={(value) => {
          if (!value) {
            setTextModalOpen(false);
            setExpandedText(null);
          }
        }}
      >
        <DialogContent className="max-w-[520px]" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader className="sr-only">
            <DialogTitle>{t("anchors", locale)}</DialogTitle>
            <DialogDescription>{t("dialogDetails", locale)}</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-snug break-words">{expandedText}</p>
        </DialogContent>
      </Dialog>

      <ImagePreviewDialog src={imagePreview} locale={locale} onClose={() => setImagePreview(null)} />

      <AnchorModal
        open={anchorModalOpen}
        locale={locale}
        existing={stopCrane}
        onClose={() => setAnchorModalOpen(false)}
        onSubmit={(item) => {
          onAddStopCrane(item);
          setAnchorModalOpen(false);
        }}
      />

      <JournalModal
        open={journalModalOpen}
        locale={locale}
        onClose={() => setJournalModalOpen(false)}
        onSubmit={(entry) => {
          onAddJournal(entry);
          setJournalModalOpen(false);
        }}
      />

      <AlertDialog open={Boolean(anchorToDelete)} onOpenChange={(value: boolean) => !value && setAnchorToDelete(null)}>
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAnchorTitle", locale)}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteAnchorDescription", locale)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", locale)}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (anchorToDelete) {
                  onRemoveStopCrane(anchorToDelete.id);
                  setAnchorToDelete(null);
                }
              }}
            >
              {t("delete", locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(journalToDelete)} onOpenChange={(value: boolean) => !value && setJournalToDelete(null)}>
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteJournalTitle", locale)}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteJournalDescription", locale)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", locale)}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (journalToDelete) {
                  onRemoveJournal(journalToDelete.id);
                  setJournalToDelete(null);
                }
              }}
            >
              {t("delete", locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BreathingDialog open={breathingOpen} locale={locale} onClose={() => setBreathingOpen(false)} isPageVisible={isPageVisible} />
    </div>
  );
}
