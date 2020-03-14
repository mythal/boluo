import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { useProfile } from './Provider';

interface Props {}

export const Page: React.FC<Props> = () => {
  const profile = useProfile();
  return (
    <div className="app-layout">
      <div className="left-header"></div>
      <div className="right-header"></div>
      <div className="sidebar"></div>
      <div className="content"></div>
      <div className="compose"></div>
    </div>
  );
};
