import { useHistory } from 'react-router-dom';
import { LoggedOut } from '../actions';
import { get } from '../api/request';
import { useDispatch } from '../store';

export function useLogout(): () => void {
  const dispatch = useDispatch();
  const history = useHistory();
  return async () => {
    await get('/users/logout');
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
    history.push('/');
  };
}
