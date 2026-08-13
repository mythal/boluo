import type { ChatItem } from '../../state/channel.types';

export const isContinuousMessage = (
  a: ChatItem | null | undefined,
  b: ChatItem | null | undefined,
): boolean => {
  return !(
    a == null ||
    b == null ||
    a.type !== 'MESSAGE' ||
    b.type !== 'MESSAGE' || // type
    a.senderId !== b.senderId ||
    a.name !== b.name ||
    (a.characterId ?? null) !== (b.characterId ?? null) ||
    (a.portraitId ?? null) !== (b.portraitId ?? null) || // sender
    a.folded ||
    b.folded ||
    a.whisperToUsers ||
    b.whisperToUsers // other
  );
};
