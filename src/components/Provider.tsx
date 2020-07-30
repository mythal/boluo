import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { get } from '@/api/request';
import Loading from './molecules/Loading';
import { Global } from '@emotion/core';
import { baseStyle } from '@/styles/atoms';
import Flash from './organisms/Flash';
import { Dispatch, useDispatch, useSelector } from '@/store';

const useGetMe = (dispatch: Dispatch, finish: () => void): void => {
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

export const Provider: React.FC = ({ children }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  useGetMe(dispatch, () => setLoading(false));
  const information = useSelector(
    (state) => state.information,
    (a, b) => a.equals(b)
  );
  if (loading) {
    return (
      <div css={{ width: '100vw', height: '100vh' }}>
        <Global styles={baseStyle} />
        <Loading />
      </div>
    );
  }
  return (
    <>
      <Global styles={baseStyle} />
      <BrowserRouter>{children}</BrowserRouter>
      {information.size !== 0 && <Flash information={information} />}
    </>
  );
};
