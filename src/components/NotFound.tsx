import * as React from 'react';
import BasePage from './templates/BasePage';
import Title from './atoms/Title';
import { useTitle } from '../hooks';

function NotFound() {
  useTitle('页面没有找到');
  return (
    <BasePage>
      <Title>没有找到</Title>
      <p>页面不存在、已删除或者你没有访问权限。</p>
    </BasePage>
  );
}

export default NotFound;
