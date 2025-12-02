import type {
  ComposeBackupWorkerRequest,
  ComposeBackupWorkerResponse,
  ComposeDraftEntry,
} from './compose-backup.worker.types';
import { parseModifiers } from '@boluo/interpreter';

const worker = self as unknown as Worker;

const DB_NAME = 'compose-backup';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;
const MAX_DRAFT_COUNT = 20;
const MIN_DRAFT_LENGTH = 3;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open compose backup db'));
  });
  return dbPromise;
};

const readDrafts = async (channelId: string): Promise<ComposeDraftEntry[]> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(channelId);
    request.onsuccess = () => {
      const result = request.result as ComposeDraftEntry[] | undefined;
      resolve(result ?? []);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to read drafts'));
  });
};

const writeDrafts = async (channelId: string, drafts: ComposeDraftEntry[]): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = drafts.length === 0 ? store.delete(channelId) : store.put(drafts, channelId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to write drafts'));
  });
};

const makeDraftId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};

// Remove modifier commands and trim the text for comparison
const normalizeDraftText = (text: string): string => {
  try {
    return parseModifiers(text).rest.trim();
  } catch {
    return text.trim();
  }
};

const shouldMergeDraft = (draftText: string, incoming: string): boolean => {
  const existing = draftText;
  const next = incoming;
  if (existing.length === 0 || next.length === 0) {
    return false;
  }
  if (existing === next) return true;
  if (next.includes(existing)) return true;
  if (existing.includes(next)) return true;
  return false;
};

const draftNormalizedCache = new Map<string, string>();

const saveDraft = async (channelId: string, text: string): Promise<void> => {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < MIN_DRAFT_LENGTH) return;
  let drafts: ComposeDraftEntry[];
  try {
    drafts = await readDrafts(channelId);
  } catch (error) {
    console.error('Failed to load compose drafts', error);
    drafts = [];
  }
  const now = Date.now();
  const normalizedIncoming = normalizeDraftText(trimmed);
  if (!normalizedIncoming) return;
  const existingIndex = drafts.findIndex((draft) => {
    const normalizedDraft = draftNormalizedCache.get(draft.id) ?? normalizeDraftText(draft.text);
    draftNormalizedCache.set(draft.id, normalizedDraft);
    return shouldMergeDraft(normalizedDraft, normalizedIncoming);
  });
  if (existingIndex >= 0) {
    const existing = drafts[existingIndex];
    if (existing) {
      drafts[existingIndex] = { ...existing, text, updatedAt: now };
    }
  } else {
    drafts.push({
      id: makeDraftId(),
      channelId,
      text,
      createdAt: now,
      updatedAt: now,
    });
  }
  drafts = drafts
    .filter((draft) => draft.text.trim().length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_DRAFT_COUNT);
  try {
    await writeDrafts(channelId, drafts);
  } catch (error) {
    console.error('Failed to persist compose drafts', error);
    return;
  }
  const response: ComposeBackupWorkerResponse = { type: 'updated', channelId };
  worker.postMessage(response);

  // Remove from cache if deleted
  if (drafts.length < drafts.length) {
    draftNormalizedCache.forEach((_, key) => {
      if (!drafts.find((draft) => draft.id === key)) {
        draftNormalizedCache.delete(key);
      }
    });
  }
};

const listDrafts = async (
  channelId: string,
  requestId: number,
): Promise<ComposeBackupWorkerResponse> => {
  try {
    const drafts = await readDrafts(channelId);
    return { type: 'listResult', channelId, requestId, drafts };
  } catch (error) {
    console.error('Failed to list compose drafts', error);
    return { type: 'listResult', channelId, requestId, drafts: [] };
  }
};

worker.addEventListener('message', (event: MessageEvent<ComposeBackupWorkerRequest>) => {
  const { data } = event;
  if (data.type === 'save') {
    void saveDraft(data.channelId, data.text);
    return;
  }
  if (data.type === 'list') {
    void listDrafts(data.channelId, data.requestId).then((message) => worker.postMessage(message));
  }
});
