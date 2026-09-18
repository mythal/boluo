import type { MoveMessageBetween } from '@boluo/api';
import type { List } from 'immutable';
import type { ChatItem } from '../../states/chat-item-set';

const position = (item: ChatItem): [number, number] =>
  item.type === 'MESSAGE'
    ? [item.message.posP, item.message.posQ]
    : [Math.ceil(item.preview.pos), 1];

/** Interpret drag indices against the rendered snapshot, then resolve bounds in live state. */
export function prepareMessageMove(
  snapshot: List<ChatItem>,
  messages: List<ChatItem>,
  messageId: string,
  destinationIndex: number,
): MoveMessageBetween | null {
  const sourceIndex = snapshot.findIndex(
    (item) => item.type === 'MESSAGE' && item.id === messageId,
  );
  const original = snapshot.get(sourceIndex);
  const target = snapshot.get(destinationIndex);
  if (
    sourceIndex < 0 ||
    destinationIndex < 0 ||
    sourceIndex === destinationIndex ||
    original?.type !== 'MESSAGE' ||
    !target
  )
    return null;

  const source = messages.find((item) => item.type === 'MESSAGE' && item.id === messageId);
  if (
    source?.type !== 'MESSAGE' ||
    source.message.channelId !== original.message.channelId ||
    source.message.posP !== original.message.posP ||
    source.message.posQ !== original.message.posQ
  )
    return null;

  const anchor = messages.find((item) => item.id === target.id && item.type === target.type);
  if (
    !anchor ||
    (anchor.type === 'PREVIEW' &&
      target.type === 'PREVIEW' &&
      anchor.preview.id !== target.preview.id)
  )
    return null;

  const anchorPos = position(anchor);
  const anchorValue = anchorPos[0] / anchorPos[1];
  const before = sourceIndex > destinationIndex;
  let neighbor: [number, number] | null = null;
  // Include hidden messages and previews, but exclude the message being moved.
  // Compare the actual request positions: preview positions are rounded up.
  for (const item of messages) {
    if (item.id === messageId || item.id === anchor.id) continue;
    const pos = position(item);
    const value = pos[0] / pos[1];
    if (before ? value < anchorValue : value > anchorValue) {
      if (
        neighbor == null ||
        (before ? value > neighbor[0] / neighbor[1] : value < neighbor[0] / neighbor[1])
      ) {
        neighbor = pos;
      }
    }
  }
  return {
    channelId: source.message.channelId,
    messageId: source.id,
    expectPos: position(source),
    range: before ? [neighbor, anchorPos] : [anchorPos, neighbor],
  };
}
