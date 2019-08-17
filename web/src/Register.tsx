import React, { useState } from 'react';
import { Redirect } from 'react-router';
import { InputChangeHandler, isLoggedIn, isUserLoading, useUserState } from './App';
import { checkEmailFormat, checkNickname } from './common';
import { gql } from 'apollo-boost';
import { useMutation } from '@apollo/react-hooks';

const REGISTER = gql`
  mutation Register($nickname: String!, $password: String!, $email: String!) {
    register(nickname: $nickname, password: $password, email: $email) {
      id
    }
  }
`;
export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const userState = useUserState();
  const [register, { loading, called, error }] = useMutation(REGISTER);

  const handleEmail: InputChangeHandler = e => setEmail(e.currentTarget.value.trim());
  const handlePassword: InputChangeHandler = e => setPassword(e.currentTarget.value);
  const handleRepeatPassword: InputChangeHandler = e => setRepeatPassword(e.currentTarget.value);
  const handleNickname: InputChangeHandler = e => setNickname(e.currentTarget.value);

  if (isUserLoading(userState)) {
    return null;
  } else if (isLoggedIn(userState)) {
    return <Redirect to="/" />;
  }

  const isPasswordMatch = password === repeatPassword;
  const passwordGreaterThan8 = password.length >= 8;
  const isValidEmail = checkEmailFormat(email);
  const [isValidNickname, nicknameInvalidReason] = checkNickname(nickname);
  const canSubmit = isPasswordMatch && passwordGreaterThan8 && isValidNickname && !loading;

  const submitRegister = (e: React.SyntheticEvent) => {
    e.preventDefault();
    register({ variables: { nickname, email, password } }).catch(console.error);
  };
  if (called && !error && !loading) {
    return <Redirect to="/login" />;
  }

  console.log('rendering', called, error, loading);

  if (called && loading) {
    return null;
  }
  return (
    <>
      <h2>Register</h2>
      <form>
        {error ? <p>Register failed: {error.message}</p> : null}
        <p>
          <label htmlFor="email">Email: </label>
          <input id="email" type="email" required={true} value={email} onChange={handleEmail} />
          {!isValidEmail ? <span>Invalid Email address</span> : null}
        </p>
        <p>
          <label htmlFor="nickname">Nickname: </label>
          <input id="nickname" type="text" required={true} value={nickname} onChange={handleNickname} />
          {!isValidNickname ? <span>{nicknameInvalidReason}</span> : null}
        </p>
        <p>
          <label htmlFor="password">Password: </label>
          <input id="password" type="password" required={true} value={password} onChange={handlePassword} />
          {!passwordGreaterThan8 ? <span>Password is too short</span> : null}
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
          <input disabled={!canSubmit} type="submit" value="Register" onClick={submitRegister} />
        </p>
      </form>
    </>
  );
};
