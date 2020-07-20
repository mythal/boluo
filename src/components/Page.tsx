import React from 'react';
import { useProfile } from './Provider';
import { css } from '@emotion/core';
import 'modern-normalize/modern-normalize.css';
import { Route, Switch } from 'react-router-dom';
import GuestHome from './GuestHome';
import Home from '../Home';
import { headerHeight, sidebarMaxWidth, sidebarMinWidth } from '../styles/atoms';

interface Props {}

const gridStyle = css`
  display: grid;
  height: 100vh;
  grid-template-columns: minmax(${sidebarMinWidth}, ${sidebarMaxWidth}) auto;
  grid-template-rows: ${headerHeight} auto;
  grid-template-areas:
    'left-header right-header'
    'sidebar content';

  &[data-sidebar='false'] {
    grid-template-areas:
      'left-header right-header'
      'content content';
  }
`;

export const Page: React.FC<Props> = () => {
  const profile = useProfile();
  return (
    <Switch>
      <Route path="/">{profile ? <Home /> : <GuestHome />}</Route>
    </Switch>
  );
};
