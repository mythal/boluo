import { useDispatch } from '../store';
import { useHistory } from 'react-router-dom';
import { get } from '../api/request';
import { LoggedOut } from '../actions';

export function useLogout(): () => void {
  const dispatch = useDispatch();
  const history = useHistory();
  return async () => {
    await get('/users/logout');
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
    history.push('/');
  };
}
