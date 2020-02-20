import React from 'react';
import { Link } from 'react-router-dom';

interface Props {}

export const Welcome: React.FC<Props> = () => {
  return (
    <article>
      <header>
        <h1>菠萝</h1>
        <p>可口的跑团工具</p>
        <p>
          <Link to="/sign_up">立即加入</Link>
        </p>
        <p>
          已经菠萝菠萝哒了？<Link to="/login">点这里登录</Link>。
        </p>
      </header>
      <section>
        <h2>为什么用菠萝？</h2>
        <ul>
          <li>为跑团（桌上RPG）特别打造。</li>
          <li>实时预览，让文字输入像当面说话一样。</li>
          <li>开放的源代码和 API。</li>
          <li>即将到来的变量系统、回合指示器、战斗地图…</li>
        </ul>
      </section>
    </article>
  );
};
