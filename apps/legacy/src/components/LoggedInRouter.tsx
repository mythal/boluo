import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Loading from '../components/molecules/Loading';
import ExploreSpace from '../components/pages/ExploreSpace';
import Logout from '../components/pages/Logout';
import My from '../components/pages/My';
import NewSpace from '../components/pages/NewSpace';
import NotFound from '../components/pages/NotFound';
import Profile from '../components/pages/Profile';
import Settings from '../components/pages/Settings';
import SpacePage from '../components/pages/SpacePage';
import BasePage from '../components/templates/BasePage';

function LoggedInRouter() {
  return (
    <BasePage>
      <Routes>
        <Route path="/" element={<My />} />
        <Route path="/my" element={<My />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/space/new" element={<NewSpace />} />
        <Route path="/space/explore" element={<ExploreSpace />} />
        <Route path="/space/:id" element={<SpacePage />} />
        <Route path="/join/space/:id/:token" element={<SpacePage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BasePage>
  );
}

export default LoggedInRouter;
