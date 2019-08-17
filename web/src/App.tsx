import React from 'react';
import { BrowserRouter as Router, Link as RouterLink, Route } from 'react-router-dom';
import './App.css';
import { Register } from './Register';
import { Login } from './Login';
import { isGuest, isLoggedIn, useGetMe, UserContext } from './user';
import { Logout } from './Logout';
import {
  AppBar,
  Button,
  createStyles,
  CssBaseline,
  IconButton,
  Link,
  makeStyles,
  Theme,
  Toolbar,
} from '@material-ui/core';
import MenuIcon from '@material-ui/icons/Menu';

function Index() {
  return null;
}

export type InputChangeHandler = React.ChangeEventHandler<HTMLInputElement>;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    menuButton: {
      marginRight: theme.spacing(2),
    },
    title: {
      flexGrow: 1,
      color: '#FFFFFF',
    },
  })
);

const App: React.FC = () => {
  const userState = useGetMe();
  const classes = useStyles();

  const loginLink = (
    <Button component={RouterLink} href="/login" to="/login" color="inherit">
      Login
    </Button>
  );
  const registerLink = (
    <Button component={RouterLink} href="/register" to="/register" color="inherit">
      Register
    </Button>
  );
  const logoutLink = (
    <Button component={RouterLink} href="/logout" to="/logout" color="inherit">
      Logout
    </Button>
  );

  return (
    <UserContext.Provider value={userState}>
      <CssBaseline />
      <Router>
        <div className={classes.root}>
          <AppBar position="static">
            <Toolbar>
              <IconButton edge="start" className={classes.menuButton} href="" color="inherit" aria-label="menu">
                <MenuIcon />
              </IconButton>
              <Link component={RouterLink} to="/" href="" variant="h6" className={classes.title}>
                boluo
              </Link>
              {isGuest(userState) ? loginLink : null}
              {isGuest(userState) ? registerLink : null}
              {isLoggedIn(userState) ? logoutLink : null}
            </Toolbar>
          </AppBar>
          {isLoggedIn(userState) ? <p>Welcome {userState.nickname}</p> : null}
          <Route path="/" exact={true} component={Index} />
          <Route path="/register/" component={Register} />
          <Route path="/login/" component={Login} />
          <Route path="/logout/" component={Logout} />
        </div>
      </Router>
    </UserContext.Provider>
  );
};

export default App;
