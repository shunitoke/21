import { openDB } from "idb";
import type { Habit, HabitLog, JournalEntry, StopCraneItem, UserSettings } from "@/lib/types";
import { createKeyMaterial, decryptString, encryptString, exportKey, getKeyFromBase64, importKey } from "@/utils/crypto";

const DB_NAME = "program-21";
const STORE_NAME = "state";
const META_STORE_NAME = "meta";
const STATE_KEY = "app";
export const DEMO_STATE_KEY = "demo";
const THEME_KEY = "theme";
const ENCRYPTION_KEY_STORAGE = "program21.encryptionKey";
const LEGACY_KEY_STORAGE = "program21.encryptionKey";

const journalEncryptionCache = new Map<string, { hash: string; encryptedContent: string }>();
let lastKeySerialized: string | null = null;

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

export interface PersistedJournalEntry extends Omit<JournalEntry, "content"> {
  content?: never;
  encryptedContent: string;
}

export interface PersistedState {
  settings: UserSettings;
  habits: Habit[];
  logs: HabitLog[];
  journal: PersistedJournalEntry[];
  stopCrane: StopCraneItem[];
}

type StoredValue = PersistedState | { key: string; value: PersistedState };

interface MetaStore {
  theme: string;
  encryptionKey: string;
}

const getDb = () =>
  openDB<{ [STORE_NAME]: StoredValue; [META_STORE_NAME]: MetaStore }>(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME);
      }
      // Migration: move theme from localStorage to IndexedDB
      if (oldVersion < 2) {
        try {
          const legacyTheme = localStorage.getItem("program21.theme");
          if (legacyTheme) {
            const tx = db.transaction(META_STORE_NAME, "readwrite");
            tx.store.put(legacyTheme, THEME_KEY);
            // Clean up localStorage after migration
            localStorage.removeItem("program21.theme");
          }
        } catch {
          // ignore
        }
      }
    },
  });

export const getThemePreference = async (): Promise<string | null> => {
  const db = await getDb();
  const theme = await db.get(META_STORE_NAME, THEME_KEY);
  return theme ?? null;
};

export const saveThemePreference = async (theme: string): Promise<void> => {
  const db = await getDb();
  await db.put(META_STORE_NAME, theme, THEME_KEY);
  // Also set cookie for SSR
  try {
    document.cookie = `program21.theme=${theme}; path=/; max-age=31536000`;
  } catch {
    // ignore
  }
};

export const getEncryptionKey = async () => {
  const db = await getDb();
  let existing = await db.get(META_STORE_NAME, ENCRYPTION_KEY_STORAGE);
  
  // Migration: check localStorage for legacy key
  if (!existing) {
    try {
      const legacyKey = localStorage.getItem(LEGACY_KEY_STORAGE);
      if (legacyKey) {
        await db.put(META_STORE_NAME, legacyKey, ENCRYPTION_KEY_STORAGE);
        existing = legacyKey;
        // Clean up localStorage after migration
        localStorage.removeItem(LEGACY_KEY_STORAGE);
      }
    } catch {
      // ignore
    }
  }
  
  if (existing && existing !== lastKeySerialized) {
    journalEncryptionCache.clear();
    lastKeySerialized = existing;
  }
  if (existing) {
    return getKeyFromBase64(existing);
  }
  const material = createKeyMaterial();
  const key = await importKey(material);
  const exported = await exportKey(key);
  await db.put(META_STORE_NAME, exported, ENCRYPTION_KEY_STORAGE);
  if (exported !== lastKeySerialized) {
    journalEncryptionCache.clear();
    lastKeySerialized = exported;
  }
  return key;
};

export const loadState = async (key: string = STATE_KEY) => {
  const db = await getDb();
  const record = await db.get(STORE_NAME, key);
  if (!record) {
    return null;
  }
  const persisted = "value" in record ? record.value : record;
  const encryptionKey = await getEncryptionKey();
  const journal = await Promise.all(
    (persisted.journal as PersistedJournalEntry[]).map(async (entry) => {
      const encryptedContent = entry.encryptedContent ?? "";
      const content = await decryptString(encryptedContent, encryptionKey);
      journalEncryptionCache.set(entry.id, { hash: hashString(content ?? ""), encryptedContent });
      return {
        ...entry,
        encryptedContent,
        content,
      };
    })
  );

  return { ...persisted, journal } as PersistedState & { journal: JournalEntry[] };
};

export const saveState = async (
  state: {
    settings: UserSettings;
    habits: Habit[];
    logs: HabitLog[];
    journal: JournalEntry[];
    stopCrane: StopCraneItem[];
  },
  key: string = STATE_KEY
) => {
  const db = await getDb();
  const encryptionKey = await getEncryptionKey();
  const journal = await Promise.all(
    state.journal.map(async (entry) => {
      const content = entry.content ?? "";
      const hash = hashString(content);
      const cached = journalEncryptionCache.get(entry.id);
      if (cached && cached.hash === hash) {
        return {
          ...entry,
          encryptedContent: cached.encryptedContent,
        };
      }
      const encryptedContent = await encryptString(content, encryptionKey);
      journalEncryptionCache.set(entry.id, { hash, encryptedContent });
      return {
        ...entry,
        encryptedContent,
      };
    })
  );

  const keepIds = new Set(state.journal.map((entry) => entry.id));
  journalEncryptionCache.forEach((_, id) => {
    if (!keepIds.has(id)) journalEncryptionCache.delete(id);
  });
  await db.put(STORE_NAME, { ...state, journal }, key);
};
