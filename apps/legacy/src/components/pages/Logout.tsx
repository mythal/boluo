import * as React from 'react';
import { useEffect } from 'react';
import Title from '../../components/atoms/Title';
import Loading from '../../components/molecules/Loading';
import { useLogout } from '../../hooks/useLogout';

function Logout() {
  const logout = useLogout();
  useEffect(() => {
    logout();
  }, [logout]);
  return (
    <>
      <Title>退出登录</Title>
      <Loading />
    </>
  );
}

export default Logout;
