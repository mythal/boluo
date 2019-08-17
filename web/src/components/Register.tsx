import React, { useState } from 'react';
import { Redirect } from 'react-router';
import { InputChangeHandler } from './App';
import { checkNickname, checkPassword, checkUsername } from '../../../common';
import { gql } from 'apollo-boost';
import { useMutation } from '@apollo/react-hooks';
import { isLoggedIn, isUserLoading, useUserState } from '../user';
import { Button, Container, Grid, makeStyles, Paper, Snackbar, TextField, Typography } from '@material-ui/core';

const REGISTER = gql`
  mutation Register($nickname: String!, $password: String!, $username: String!) {
    register(nickname: $nickname, password: $password, username: $username) {
      id
    }
  }
`;

const useStyles = makeStyles(theme => ({
  paper: {
    padding: theme.spacing(3, 2),
    margin: '5rem 0',
  },
}));

export const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const userState = useUserState();
  const [register, { loading, called, error }] = useMutation(REGISTER);
  const classes = useStyles();

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

  const registerFailedSnackBar = (
    <Snackbar open={!!error} autoHideDuration={6000} message={`Register Failed: ${error}`} />
  );

  return (
    <Container maxWidth="sm">
      {error ? registerFailedSnackBar : null}
      <Paper className={classes.paper}>
        <Typography component="h1" variant="h5">
          Register
        </Typography>
        <form onSubmit={submitRegister}>
          <Grid container={true} spacing={2}>
            <Grid item={true} xs={12} sm={6}>
              <TextField
                required={true}
                fullWidth={true}
                name="username"
                onChange={handleUsername}
                error={!isValidUsername}
                label="Username"
                helperText={usernameInvalidReason}
                type="text"
              />
            </Grid>
            <Grid item={true} xs={12} sm={6}>
              <TextField
                required={true}
                fullWidth={true}
                name="nickname"
                onChange={handleNickname}
                error={!isValidNickname}
                label="Nickname"
                helperText={nicknameInvalidReason}
                type="text"
              />
            </Grid>
            <Grid item={true} xs={12} sm={6}>
              <TextField
                required={true}
                fullWidth={true}
                name="password"
                onChange={handlePassword}
                error={!isValidPassword}
                label="Password"
                helperText={passwordInvalidReason}
                type="password"
              />
            </Grid>
            <Grid item={true} xs={12} sm={6}>
              <TextField
                required={true}
                fullWidth={true}
                name="repeat-password"
                onChange={handleRepeatPassword}
                error={password !== repeatPassword}
                label="Repeat Password"
                helperText={!isPasswordMatch ? <span>Passwords do not match</span> : null}
                type="password"
              />
            </Grid>
            <Grid item={true} xs={12} sm={12}>
              <Button type="submit" fullWidth={true} variant="contained" disabled={!canSubmit} color="primary" href="">
                Register
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};
