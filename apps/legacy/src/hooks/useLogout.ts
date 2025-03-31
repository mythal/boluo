import { useNavigate } from 'react-router-dom';
import { LoggedOut } from '../actions';
import { get } from '../api/request';
import { useDispatch } from '../store';

export function useLogout(): () => void {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return async () => {
    await get('/users/logout');
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
    navigate('/');
  };
}
