import { useSelector } from '../store';

export function useIsLoggedIn(): boolean {
  return useSelector((state) => state.profile !== undefined);
}
