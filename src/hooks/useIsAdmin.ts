import { useSelector } from '../store';
import { usePane } from './usePane';

export function useIsAdmin(): boolean {
  const pane = usePane();
  return useSelector((state) => {
    const chat = state.chatPane[pane];
    if (state.profile === undefined || chat === undefined) {
      return false;
    }
    const spaceEntry = state.profile.spaces.get(chat.channel.spaceId);
    return spaceEntry ? spaceEntry.member.isAdmin : false;
  });
}
