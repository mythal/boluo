import { Id } from '../utils/id';
import { useSelector } from '../store';

export const useMyId = (): Id | undefined => {
  return useSelector((state) => state.profile?.user.id);
};
