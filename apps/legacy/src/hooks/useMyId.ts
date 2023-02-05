import { useSelector } from '../store';
import { Id } from '../utils/id';

export const useMyId = (): Id | undefined => {
  return useSelector((state) => state.profile?.user.id);
};
