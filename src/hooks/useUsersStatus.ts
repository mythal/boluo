import { Id } from '../utils/id';
import { UserStatus } from '../api/spaces';
import { useSelector } from '../store';

export function useUsersStatus(spaceId: Id): Record<Id, UserStatus> | null {
  return useSelector((state) => {
    const spaceResult = state.ui.spaceSet.get(spaceId);
    if (spaceResult?.isOk) {
      return spaceResult.value.usersStatus;
    } else {
      return null;
    }
  });
}
