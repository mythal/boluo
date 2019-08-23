import React, { useState } from 'react';
import { LOGIN_URL, TOKEN_KEY } from '../settings';
import { Redirect } from 'react-router';
import { InputChangeHandler } from './App';
import { isLoggedIn, isUserLoading, useUserState } from '../user';
import { Button, Container, Grid, makeStyles, Paper, Snackbar, TextField, Typography } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  paper: {
    padding: theme.spacing(3, 2),
    margin: '5rem 0',
  },
}));

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginFailure, setLoginFailure] = useState(false);
  const userState = useUserState();
  const classes = useStyles();

  const handleUsername: InputChangeHandler = e => setUsername(e.currentTarget.value);
  const handlePassword: InputChangeHandler = e => setPassword(e.currentTarget.value);

  const setToken = (result: { token: string }) => {
    if (result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
      location.reload();
    }
  };

  const submitLogin = (e: React.SyntheticEvent) => {
    e.preventDefault();
    fetch(LOGIN_URL, {
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

  const loginFailedSnackBar = <Snackbar open={loginFailure} autoHideDuration={6000} message={'Login Failed'} />;

  const canSubmit = password.length >= 8 && username.length > 2;

  return (
    <Container maxWidth="sm">
      <Paper className={classes.paper}>
        <Typography component="h1" variant="h5">
          Login
        </Typography>
        {loginFailure ? loginFailedSnackBar : null}
        <form onSubmit={submitLogin}>
          <Grid container={true} spacing={2}>
            <Grid item={true} xs={12} sm={6}>
              <TextField required fullWidth name="username" onChange={handleUsername} label="Username" type="text" />
            </Grid>
            <Grid item={true} xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="password"
                onChange={handlePassword}
                label="Password"
                type="password"
              />
            </Grid>
            <Grid item={true} sm={12}>
              <Button type="submit" disabled={!canSubmit} fullWidth={true} href="" variant="contained" color="primary">
                Login
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
