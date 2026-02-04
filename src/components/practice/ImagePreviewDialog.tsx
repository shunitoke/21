"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import type { Locale } from "@/lib/types";

interface ImagePreviewDialogProps {
  src: string | null;
  locale: Locale;
  onClose: () => void;
}

export function ImagePreviewDialog({ src, onClose }: ImagePreviewDialogProps) {
  if (!src) return null;

  return (
    <Lightbox
      open={Boolean(src)}
      close={onClose}
      slides={[{ src, alt: "" }]}
      plugins={[Zoom]}
      zoom={{
        maxZoomPixelRatio: 3,
        zoomInMultiplier: 2,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
      }}
      render={{
        buttonPrev: () => null,
        buttonNext: () => null,
      }}
      controller={{
        closeOnBackdropClick: true,
        closeOnPullDown: true,
      }}
      styles={{
        container: { backgroundColor: "rgba(0, 0, 0, 0.85)" },
      }}
    />
  );
}
