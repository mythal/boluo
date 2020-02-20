import React from 'react';
import { Link } from 'react-router-dom';

interface Props {}

export const Welcome: React.FC<Props> = () => {
  return (
    <div className="text-base p-6 md:flex max-w-2xl mx-auto">
      <div className="md:w-1/3 mb-5 border-r p-4">
        <h1 className="text-3xl">菠萝</h1>
        <p className="text-xl">可口的跑团工具</p>
        <p className="text-center">
          <Link
            className="text-xl py-3 px-6 my-5 bg-yellow-600 text-white
            hover:text-white active:text-white hover:no-underline inline-block
            hover:bg-yellow-500"
            to="/sign_up"
          >
            立即加入
          </Link>
        </p>
        <p className="text-xs">
          已经菠萝菠萝哒了？<Link to="/login">点这里登录</Link>。
        </p>
      </div>
      <div className="p-4">
        <h2 className="text-xl my-5">为什么用菠萝？</h2>
        <ul className="pl-4">
          <li className="py-1">为跑团（桌上RPG）特别打造。</li>
          <li className="py-1">实时预览，让文字输入像当面说话一样。</li>
          <li className="py-1">开放的源代码和 API。</li>
          <li className="py-1">即将到来的变量系统、回合指示器、战斗地图…</li>
        </ul>
      </div>
    </div>
  );
};
