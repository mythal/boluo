import type {
  ComposeBackupWorkerRequest,
  ComposeBackupWorkerResponse,
  ComposeDraftEntry,
} from './compose-backup.worker.types';

type DraftUpdateListener = (channelId: string) => void;

let workerInstance: Worker | null = null;
const pendingRequests = new Map<number, (drafts: ComposeDraftEntry[]) => void>();
const listeners = new Set<DraftUpdateListener>();
let requestId = 0;

const ensureWorker = (): Worker | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  if (workerInstance) {
    return workerInstance;
  }
  try {
    workerInstance = new Worker(new URL('./compose-backup.worker.ts', import.meta.url), {
      type: 'module',
    });
  } catch (error) {
    console.error('Failed to create compose backup worker', error);
    workerInstance = null;
    return null;
  }
  workerInstance.addEventListener(
    'message',
    ({ data }: MessageEvent<ComposeBackupWorkerResponse>) => {
      if (data.type === 'listResult') {
        const resolver = pendingRequests.get(data.requestId);
        if (resolver) {
          resolver(data.drafts);
          pendingRequests.delete(data.requestId);
        }
        return;
      }
      if (data.type === 'updated') {
        listeners.forEach((listener) => listener(data.channelId));
      }
    },
  );
  return workerInstance;
};

const postMessage = (message: ComposeBackupWorkerRequest): void => {
  const worker = ensureWorker();
  if (!worker) return;
  worker.postMessage(message);
};

export const saveDraftInWorker = (channelId: string, text: string): void => {
  postMessage({ type: 'save', channelId, text });
};

export const fetchDraftsFromWorker = async (channelId: string): Promise<ComposeDraftEntry[]> => {
  const worker = ensureWorker();
  if (!worker) return [];
  const currentRequestId = ++requestId;
  return await new Promise<ComposeDraftEntry[]>((resolve) => {
    pendingRequests.set(currentRequestId, resolve);
    worker.postMessage({ type: 'list', channelId, requestId: currentRequestId });
  });
};

export const subscribeDraftUpdates = (listener: DraftUpdateListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
