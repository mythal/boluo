import { useNavigate } from 'react-router-dom';
import { type LoggedOut } from '../actions';
import { get } from '../api/request';
import { useDispatch } from '../store';
import { clearAuthToken } from '../utils/token';

export function useLogout(): () => void {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return async () => {
    await get('/users/logout');
    clearAuthToken();
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
    navigate('/');
  };
}
