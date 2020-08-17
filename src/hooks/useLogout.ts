import { useDispatch } from '../store';
import { useHistory } from 'react-router-dom';
import { get } from '../api/request';
import { clearCsrfToken } from '../api/csrf';
import { LoggedOut } from '../actions/profile';

export function useLogout(): () => void {
  const dispatch = useDispatch();
  const history = useHistory();
  return async () => {
    await get('/users/logout');
    clearCsrfToken();
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
    history.push('/');
  };
}
