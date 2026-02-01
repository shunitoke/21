import type { Habit, HabitLog, JournalEntry, StopCraneItem, UserSettings } from "@/lib/types";
import { loadState, DEMO_STATE_KEY } from "./storage";
import JSZip from "jszip";
import CryptoJS from "crypto-js";

export interface ExportedData {
  version: number;
  exportedAt: string;
  data: {
    settings: UserSettings;
    habits: Habit[];
    logs: HabitLog[];
    journal: JournalEntry[];
    stopCrane: StopCraneItem[];
  };
}

// Collect all media references from data
function collectMediaReferences(journal: JournalEntry[], stopCrane: StopCraneItem[]): string[] {
  const mediaFiles = new Set<string>();
  
  for (const entry of journal) {
    if (entry.type === "audio" && entry.content) {
      mediaFiles.add(entry.content);
    }
  }
  
  for (const item of stopCrane) {
    if (item.type === "image" && item.content) {
      mediaFiles.add(item.content);
    }
  }
  
  return Array.from(mediaFiles);
}

// Fetch file as ArrayBuffer
async function fetchFileAsBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
    const response = await fetch(fullUrl);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

// Export data as encrypted ZIP - ONLY main user account, NOT demo
export async function exportEncryptedArchive(password: string): Promise<Blob> {
  const mainState = await loadState();
  
  const data = mainState || {
    settings: { id: "settings", locale: "ru", theme: "system", ally: "friend", demoMode: false } as UserSettings,
    habits: [],
    logs: [],
    journal: [],
    stopCrane: [],
  };

  const exportedData: ExportedData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      // Exclude theme, locale, ally from export - these are device/user preferences
      settings: { ...data.settings, theme: "system", locale: "ru", ally: "friend" },
      habits: data.habits,
      logs: data.logs,
      journal: data.journal.map(j => ({ ...j, content: j.content || "" })),
      stopCrane: data.stopCrane,
    },
  };

  // Create ZIP
  const zip = new JSZip();
  
  // Add data.json
  zip.file("data.json", JSON.stringify(exportedData, null, 2));
  
  // Add media files
  const mediaFiles = collectMediaReferences(exportedData.data.journal, exportedData.data.stopCrane);
  const mediaFolder = zip.folder("media");
  
  for (const filename of mediaFiles) {
    const buffer = await fetchFileAsBuffer(filename);
    if (buffer && mediaFolder) {
      const cleanName = filename.replace(/^.*[\\/]/, ""); // Get filename only
      mediaFolder.file(cleanName, buffer);
    }
  }
  
  // Generate ZIP as base64
  const zipBase64 = await zip.generateAsync({ type: "base64" });
  
  // Encrypt with AES (CryptoJS uses OpenSSL format which includes salt automatically)
  const encrypted = CryptoJS.AES.encrypt(zipBase64, password).toString();
  
  // Return as blob
  return new Blob([encrypted], { type: "application/octet-stream" });
}

// Import and decrypt archive
export async function importEncryptedArchive(file: File, password: string): Promise<{ data: ExportedData["data"]; media: Record<string, ArrayBuffer> }> {
  const encryptedText = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
  
  // Decrypt (CryptoJS handles OpenSSL format with salt automatically)
  let decrypted: CryptoJS.lib.WordArray;
  try {
    decrypted = CryptoJS.AES.decrypt(encryptedText, password);
  } catch {
    throw new Error("Invalid password");
  }
  
  if (!decrypted || decrypted.sigBytes === 0) {
    throw new Error("Invalid password");
  }
  
  // Convert to UTF-8 with error handling
  let zipBase64: string;
  try {
    zipBase64 = decrypted.toString(CryptoJS.enc.Utf8);
    if (!zipBase64 || zipBase64.length === 0) {
      throw new Error("Invalid password");
    }
  } catch {
    throw new Error("Invalid password");
  }
  
  // Load ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBase64, { base64: true });
  } catch {
    throw new Error("Invalid password");
  }
  
  // Extract data.json
  const dataFile = zip.file("data.json");
  if (!dataFile) {
    throw new Error("Invalid archive: data.json not found");
  }
  
  const dataText = await dataFile.async("text");
  const exportedData: ExportedData = JSON.parse(dataText);
  
  if (!exportedData.version || !exportedData.data) {
    throw new Error("Invalid data format");
  }
  
  // Extract media files
  const media: Record<string, ArrayBuffer> = {};
  const mediaFolder = zip.folder("media");
  
  if (mediaFolder) {
    for (const [filename, fileObj] of Object.entries(mediaFolder.files)) {
      if (!fileObj.dir) {
        const buffer = await fileObj.async("arraybuffer");
        media[filename.replace("media/", "")] = buffer;
      }
    }
  }
  
  return { data: exportedData.data, media };
}

export function downloadEncryptedArchive(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `program21-backup-${new Date().toISOString().split("T")[0]}.p21`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function restoreMediaFiles(media: Record<string, ArrayBuffer>): Promise<void> {
  if (Object.keys(media).length === 0) return;
  
  const dbName = "program-21-media";
  const storeName = "files";
  
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);

  for (const [filename, buffer] of Object.entries(media)) {
    try {
      // Convert ArrayBuffer to base64 for storage
      const base64 = arrayBufferToBase64(buffer);
      await new Promise<void>((resolve, reject) => {
        const request = store.put(base64, filename);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Continue with next file
    }
  }

  db.close();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function getMediaFileUrl(filename: string): Promise<string | null> {
  const dbName = "program-21-media";
  const storeName = "files";
  
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    
    const base64Data = await new Promise<string | undefined>((resolve) => {
      const request = store.get(filename);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    });

    db.close();
    return base64Data || null;
  } catch {
    return null;
  }
}
