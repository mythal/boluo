import { Dispatch } from '../store';
import { useEffect } from 'react';
import { get } from '../api/request';

export const useGetMe = (dispatch: Dispatch, finish: () => void): void => {
  useEffect(() => {
    (async () => {
      const me = await get('/users/get_me');
      if (me.isOk && me.value !== null) {
        const { user, mySpaces, myChannels } = me.value;
        dispatch({ type: 'LOGGED_IN', user, myChannels, mySpaces });
      } else {
        dispatch({ type: 'LOGGED_OUT' });
      }
      finish();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
