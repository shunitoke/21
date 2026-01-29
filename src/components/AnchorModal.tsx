"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import type { Locale, StopCraneItem, StopCraneType } from "@/lib/types";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AudioAnchor from "@/components/AudioAnchor";

interface AnchorModalProps {
  open: boolean;
  locale: Locale;
  existing: StopCraneItem[];
  onClose: () => void;
  onSubmit: (item: StopCraneItem) => void;
}

const AnchorModal = ({ open, locale, existing, onClose, onSubmit }: AnchorModalProps) => {
  const maxImageSize = 5 * 1024 * 1024;
  const maxAudioSize = 10 * 1024 * 1024;
  const [type, setType] = useState<StopCraneType>("text");
  const [content, setContent] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [typeWarning, setTypeWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType("text");
    setContent("");
    setFileError(null);
    setLinkError(null);
    setTypeWarning(null);
  }, [open]);

  const canAddAnchor = (nextType: StopCraneType) => {
    if (nextType === "audio" || nextType === "radio" || nextType === "stop") {
      return existing.filter((item) => item.type === nextType).length < 1;
    }
    return true;
  };

  const setTypeAndWarn = (nextType: StopCraneType) => {
    setType(nextType);
    setContent("");
    setFileError(null);
    setLinkError(null);
    if (nextType === "audio" && !canAddAnchor(nextType)) {
      setTypeWarning(t("replaceAudio", locale));
    } else if (nextType === "radio" && !canAddAnchor(nextType)) {
      setTypeWarning(t("replaceRadio", locale));
    } else if (nextType === "stop" && !canAddAnchor(nextType)) {
      setTypeWarning(t("replaceStop", locale));
    } else {
      setTypeWarning(null);
    }
  };

  const validateLink = (value: string) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    if (type === "text") {
      setLinkError(value.length > 200 ? t("textLimit", locale) : null);
      return;
    }
    if (type === "link") {
      if (value.length > 500) {
        setLinkError(t("linkLimit", locale));
        return;
      }
      setLinkError(validateLink(value) ? null : t("linkInvalid", locale));
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxSize = type === "image" ? maxImageSize : maxAudioSize;
    if (file.size > maxSize) {
      setFileError(t("fileTooLarge", locale));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setContent(reader.result);
        setFileError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const canSubmit =
    type === "radio" || type === "stop" ? true : content.trim().length >= 2 && !linkError && !fileError;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="max-w-[560px] gap-4">
        <DialogHeader>
          <DialogTitle>{t("newAnchorTitle", locale)}</DialogTitle>
          <DialogDescription className="sr-only">{t("dialogDetails", locale)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Card className="grid grid-cols-3 gap-2 p-3">
            {[
              { value: "text", label: t("text", locale) },
              { value: "link", label: t("link", locale) },
              { value: "image", label: t("image", locale) },
              { value: "audio", label: t("audio", locale) },
              { value: "radio", label: t("radio", locale) },
              { value: "stop", label: t("stopAnchor", locale) },
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={type === item.value ? "default" : "outline"}
                size="xs"
                onClick={() => setTypeAndWarn(item.value as StopCraneType)}
                disabled={!canAddAnchor(item.value as StopCraneType)}
              >
                {item.label}
              </Button>
            ))}
          </Card>
          {typeWarning && <p className="text-xs text-muted-foreground">{typeWarning}</p>}
          {(type === "image" || type === "audio") && (
            <div className="grid gap-2">
              <div className="grid gap-2">
                <span className="text-xs text-muted-foreground">{t("chooseFile", locale)}</span>
                <Input type="file" accept={type === "image" ? "image/*" : "audio/*"} onChange={handleFileSelect} />
              </div>
              <p className="text-xs text-muted-foreground">
                {type === "image" ? t("maxSizeImage", locale) : t("maxSizeAudio", locale)}
              </p>
              {fileError && <p className="text-xs text-red-400">{fileError}</p>}
              {type === "image" && content && <img src={content} alt="" className="anchor-preview" />}
              {type === "audio" && content && <AudioAnchor src={content} locale={locale} />}
            </div>
          )}
          {type === "radio" && <p className="text-xs text-muted-foreground">Nightwave Plaza 24/7</p>}
          {type === "stop" && <p className="text-xs text-muted-foreground">STOP</p>}
          {type !== "image" && type !== "audio" && type !== "radio" && type !== "stop" && (
            <div className="grid gap-2">
              <span className="text-xs text-muted-foreground">{t("content", locale)}</span>
              <Input value={content} onChange={(event) => handleContentChange(event.target.value)} />
              {linkError && <span className="text-xs text-red-400">{linkError}</span>}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} type="button">
            {t("cancel", locale)}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                id: `anchor-${Date.now()}`,
                type,
                content: type === "stop" ? "STOP" : type === "radio" ? "https://radio.plaza.one/ogg" : content.trim(),
                createdAt: new Date().toISOString(),
              })
            }
          >
            {t("save", locale)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnchorModal;
