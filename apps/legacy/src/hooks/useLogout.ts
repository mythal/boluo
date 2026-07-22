import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { type LoggedOut } from '../actions';
import { get } from '../api/request';
import { useDispatch } from '../store';
import { clearAuthToken } from '../utils/token';
import { clearProfileQueryCache } from './profileCache';

export function useLogout(): () => void {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mutate } = useSWRConfig();
  return async () => {
    await get('/users/logout');
    clearAuthToken();
    await clearProfileQueryCache(mutate);
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
    navigate('/');
  };
}
