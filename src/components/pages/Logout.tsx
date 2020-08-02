import * as React from 'react';
import { useEffect } from 'react';
import { useLogout } from '@/hooks';
import Title from '@/components/atoms/Title';
import Loading from '@/components/molecules/Loading';

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
