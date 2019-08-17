import React, { useState } from 'react';
import { TOKEN_KEY } from './settings';
import { Redirect } from 'react-router';
import { InputChangeHandler } from './App';
import { isLoggedIn, isUserLoading, useUserState } from './user';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginFailure, setLoginFailure] = useState(false);
  const userState = useUserState();

  const handleUsername: InputChangeHandler = e => setUsername(e.currentTarget.value);
  const handlePassword: InputChangeHandler = e => setPassword(e.currentTarget.value);

  const setToken = (result: { token: string }) => {
    if (result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
      userState.refetch();
    }
  };

  const submitLogin = (e: React.SyntheticEvent) => {
    e.preventDefault();
    fetch(process.env.LOGIN_URL || '', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: { 'content-type': 'application/json' },
    }).then(response => {
      if (response.status === 401) {
        setLoginFailure(true);
      } else {
        response.json().then(setToken);
      }
    });
  };

  if (isUserLoading(userState)) {
    return null;
  } else if (isLoggedIn(userState)) {
    return <Redirect to="/" />;
  }

  return (
    <>
      <h2>Login</h2>
      <form onSubmit={submitLogin}>
        {loginFailure ? <p>Login Failed</p> : null}
        <p>
          <label htmlFor="username">Username: </label>
          <input id="username" type="text" value={username} onChange={handleUsername} />
        </p>
        <p>
          <label htmlFor="password">Password: </label>
          <input id="password" type="password" value={password} onChange={handlePassword} />
        </p>
        <p>
          <input type="submit" value="Login" />
        </p>
      </form>
    </>
  );
}
