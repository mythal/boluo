import * as React from 'react';
import { Link } from 'react-router-dom';
import { color, floatRight, link, listStyleSquare, mT, mX, mY, p, textColor, textXl } from '@/styles/atoms';
import logo from '@/assets/logo.svg';
import { darken } from 'polished';
import Title from '../atoms/Title';
import { OutlineButtonLink } from '@/components/atoms/OutlineButton';

function GuestHome() {
  return (
    <>
      <svg css={[mY(8), floatRight, mX(4)]} width="14rem" height="14rem" viewBox={logo.viewBox}>
        <use xlinkHref={logo.url} />
      </svg>
      <Title>菠萝</Title>
      <h2 css={[textXl, mY(2)]}>
        游玩
        <ruby>
          桌面角色扮演游戏<rt>Tabletop Role-Playing Game</rt>
        </ruby>
        、微酸香甜。
      </h2>
      <p>
        <OutlineButtonLink to="/sign-up">立即加入</OutlineButtonLink>
      </p>
      <p>
        已经<del css={color(darken(0.5, textColor))}>菠萝菠萝哒</del>有账号了？
        <Link css={link} to="/login">
          点此登录
        </Link>
      </p>

      <h2 css={[textXl, mT(8)]}>为什么用菠萝？</h2>
      <ul css={listStyleSquare}>
        <li>专门打造的文字为主 TPRG 工具。</li>
        <li>实时预览，让文字输入像当面说话一样。</li>
        <li>开放的源代码和 API。</li>
        <li>即将到来的变量系统、回合指示器、战斗地图…</li>
      </ul>
    </>
  );
}

export default React.memo(GuestHome);
