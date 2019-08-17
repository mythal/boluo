import React from 'react';
import { BrowserRouter as Router, Link, Route } from 'react-router-dom';
import './App.css';
import { Register } from './Register';
import { Login } from './Login';
import { isGuest, isLoggedIn, useGetMe, UserContext } from './user';
import { Logout } from './Logout';

function Index() {
  return <h2>Home</h2>;
}

export type InputChangeHandler = React.ChangeEventHandler<HTMLInputElement>;

const App: React.FC = () => {
  const userState = useGetMe();

  const loginLink = <Link to="/login/">Login</Link>;
  const registerLink = <Link to="/register/">Register</Link>;
  const logoutLink = <Link to="/logout/">Logout</Link>;

  return (
    <UserContext.Provider value={userState}>
      <h1>🍍</h1>
      <Router>
        <div className="App">
          <nav>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              {isGuest(userState) ? <li>{loginLink}</li> : null}
              {isGuest(userState) ? <li>{registerLink}</li> : null}
              {isLoggedIn(userState) ? <li>{logoutLink}</li> : null}
            </ul>
          </nav>
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
