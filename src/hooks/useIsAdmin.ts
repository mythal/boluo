import { useSelector } from '../store';

export function useIsAdmin(): boolean {
  return useSelector((state) => {
    if (state.profile === undefined || state.chat === undefined) {
      return false;
    }
    const spaceEntry = state.profile.spaces.get(state.chat.channel.spaceId);
    return spaceEntry ? spaceEntry.member.isAdmin : false;
  });
}
