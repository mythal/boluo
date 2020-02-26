import React from 'react';
import { Link } from 'react-router-dom';

interface Props {}

export const NotFound: React.FC<Props> = () => {
  return (
    <div className="text-center">
      <h1 className="text-3xl my-5">没有找到</h1>
      <p className="my-2">这里什么都没有 (/･_･＼)</p>
      <p>
        <Link className="link" to="/">
          回到首页
        </Link>
      </p>
    </div>
  );
};
