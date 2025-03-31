import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import ExploreSpace from '../components/pages/ExploreSpace';
import GuestHome from '../components/pages/GuestHome';
import Login from '../components/pages/Login';
import NotFound from '../components/pages/NotFound';
import Profile from '../components/pages/Profile';
import SignUp from '../components/pages/SignUp';
import SpacePage from '../components/pages/SpacePage';
import BasePage from '../components/templates/BasePage';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';

export function GuestRouter() {
  return (
    <BasePage>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/confirm-password-reset/:token" element={<ResetPasswordConfirm />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/space/explore" element={<ExploreSpace />} />
        <Route path="/space/:id" element={<SpacePage />} />
        <Route path="/join/space/:id/:token" element={<Navigate to="/login" />} />
        <Route path="/" element={<GuestHome />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BasePage>
  );
}

export default GuestRouter;
