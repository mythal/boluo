import { AppDispatch } from '../store';
import { useEffect } from 'react';
import { get } from '../api/request';

export const useGetMe = (dispatch: AppDispatch, finish: () => void): void => {
  useEffect(() => {
    const loadMe = async () => {
      const me = await get('/users/get_me');
      if (me.isOk) {
        if (me.value) {
          const { user, mySpaces, myChannels, settings } = me.value;
          dispatch({ type: 'LOGGED_IN', user, myChannels, mySpaces, settings });
        } else {
          dispatch({ type: 'LOGGED_OUT' });
        }
      }
    };
    loadMe().then(() => finish());
    setInterval(loadMe, 20 * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
