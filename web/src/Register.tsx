import React, { useState } from 'react';
import { Redirect } from 'react-router';
import { InputChangeHandler } from './App';
import { checkNickname, checkPassword, checkUsername } from './common';
import { gql } from 'apollo-boost';
import { useMutation } from '@apollo/react-hooks';
import { isLoggedIn, isUserLoading, useUserState } from './user';

const REGISTER = gql`
  mutation Register($nickname: String!, $password: String!, $username: String!) {
    register(nickname: $nickname, password: $password, username: $username) {
      id
    }
  }
`;
export const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const userState = useUserState();
  const [register, { loading, called, error }] = useMutation(REGISTER);

  const handleUsername: InputChangeHandler = e => setUsername(e.currentTarget.value.trim());
  const handlePassword: InputChangeHandler = e => setPassword(e.currentTarget.value);
  const handleRepeatPassword: InputChangeHandler = e => setRepeatPassword(e.currentTarget.value);
  const handleNickname: InputChangeHandler = e => setNickname(e.currentTarget.value);

  if (isUserLoading(userState)) {
    return null;
  } else if (isLoggedIn(userState)) {
    return <Redirect to="/" />;
  }

  const isPasswordMatch = password === repeatPassword;
  const [isValidPassword, passwordInvalidReason] = checkPassword(password);
  const [isValidUsername, usernameInvalidReason] = checkUsername(username);
  const [isValidNickname, nicknameInvalidReason] = checkNickname(nickname);
  const canSubmit = isPasswordMatch && isValidPassword && isValidUsername && isValidNickname && !loading;

  const submitRegister = (e: React.SyntheticEvent) => {
    e.preventDefault();
    register({ variables: { nickname, username, password } }).catch(console.error);
  };
  if (called && !error && !loading) {
    return <Redirect to="/login" />;
  }

  if (called && loading) {
    return null;
  }
  return (
    <>
      <h2>Register</h2>
      <form onSubmit={submitRegister}>
        {error ? <p>Register failed: {error.message}</p> : null}
        <p>
          <label htmlFor="username">Username: </label>
          <input id="username" type="text" required={true} value={username} onChange={handleUsername} />
          {!isValidUsername ? <span>{usernameInvalidReason}</span> : null}
        </p>
        <p>
          <label htmlFor="nickname">Nickname: </label>
          <input id="nickname" type="text" required={true} value={nickname} onChange={handleNickname} />
          {!isValidNickname ? <span>{nicknameInvalidReason}</span> : null}
        </p>
        <p>
          <label htmlFor="password">Password: </label>
          <input id="password" type="password" required={true} value={password} onChange={handlePassword} />
          {!isValidPassword ? <span>{passwordInvalidReason}</span> : null}
        </p>
        <p>
          <label htmlFor="repeat-password">Repeat Password: </label>
          <input
            id="repeat-password"
            type="password"
            required={true}
            value={repeatPassword}
            onChange={handleRepeatPassword}
          />
          {!isPasswordMatch ? <span>Passwords do not match</span> : null}
        </p>
        <p>
          <input disabled={!canSubmit} type="submit" value="Register" />
        </p>
      </form>
    </>
  );
};
