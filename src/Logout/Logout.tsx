import React, { useEffect } from 'react';
import { useDispatch, useMe } from '../App/App';
import { get } from '../api/request';
import { LOGGED_OUT, LoggedOut } from '../App/actions';
import { GUEST } from '../App/states';
import { Redirect } from 'react-router-dom';
import { useNext } from '../hooks';
import { clearCsrfToken } from '../api/csrf';

const useLogout = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    get('/users/logout').then(() => {
      dispatch<LoggedOut>({ tag: LOGGED_OUT });
    });
    clearCsrfToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export const Logout: React.FC = () => {
  const next = useNext();
  const me = useMe();
  useLogout();

  if (me !== GUEST) {
    return <div>Loading...</div>;
  } else {
    return <Redirect to={next} />;
  }
};
