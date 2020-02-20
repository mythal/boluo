import React, { useEffect } from 'react';
import { setTitle } from '../title';
interface Props {}

export const NotFound: React.FC<Props> = () => {
  useEffect(() => {
    setTitle('没有找到');
    return setTitle;
  }, []);

  return <div>没有找到</div>;
};
