import { useEffect } from 'react';
import { get } from '../api/request';
import { type Dispatch } from '../store';

export const useGetMe = (dispatch: Dispatch, finish: () => void): void => {
  useEffect(() => {
    const cancel = new AbortController();
    const loadMe = async () => {
      let me = await get('/users/get_me');
      if (me.isErr && me.value.code === 'FETCH_FAIL') {
        await new Promise((resolve) => setTimeout(resolve, 100));
        me = await get('/users/get_me');
      }
      if (cancel.signal.aborted) return;
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
    const handle = setInterval(loadMe, 20 * 1000);
    return () => {
      cancel.abort();
      clearInterval(handle);
    };
  }, [dispatch, finish]);
};
