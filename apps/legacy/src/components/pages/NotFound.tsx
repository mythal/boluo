import * as React from 'react';
import { useTitle } from '../../hooks/useTitle';
import Title from '../atoms/Title';

function NotFound() {
  useTitle('页面没有找到');
  return (
    <>
      <Title>没有找到</Title>
      <p>所请求的资源不存在、已删除或者你没有权限访问。</p>
    </>
  );
}

export default NotFound;
