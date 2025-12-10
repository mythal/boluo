import { useSelector } from '../store';
import { type Id } from '../utils/id';

export function useIsAdmin(channelId: Id): boolean {
  return useSelector((state) => {
    const chat = state.chatStates.get(channelId);
    if (state.profile === undefined || chat === undefined) {
      return false;
    }
    const spaceEntry = state.profile.spaces.get(chat.channel.spaceId);
    return spaceEntry ? spaceEntry.member.isAdmin : false;
  });
}
