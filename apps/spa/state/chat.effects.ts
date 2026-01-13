import type { ChatEffect } from './chat.types';

let effectCounter = 0;

export const createEffectId = (): string => {
  effectCounter += 1;
  return `effect:${Date.now()}:${effectCounter}`;
};

export const mergeEffects = (current: ChatEffect[], incoming: ChatEffect[]): ChatEffect[] => {
  if (incoming.length === 0) return current;
  let next = current;
  for (const effect of incoming) {
    const dedupeKey = 'dedupeKey' in effect ? effect.dedupeKey : undefined;
    if (dedupeKey) {
      const filtered = next.filter(
        (item) => !('dedupeKey' in item) || item.dedupeKey !== dedupeKey,
      );
      next = filtered.length === next.length ? next : filtered;
    }
    next = next.concat(effect);
  }
  return next;
};
