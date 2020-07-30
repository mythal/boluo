import * as React from 'react';
import { Link } from 'react-router-dom';
import { css } from '@emotion/core';
import {
  bgColor,
  color,
  floatRight,
  fontBold,
  inlineBlock,
  link,
  linkColor,
  listStyleSquare,
  mT,
  mX,
  mY,
  p,
  roundedPx,
  textColor,
  textLg,
  textXl,
  uiShadow,
} from '@/styles/atoms';
import logo from '@/assets/logo.svg';
import { darken, lighten } from 'polished';
import Title from '../atoms/Title';

const signUpButtonStyle = css`
  background-color: ${darken(0.05, linkColor)};
  ${p(4)};
  ${textLg};
  ${fontBold};
  text-decoration: none;
  color: ${bgColor};
  ${roundedPx};
  ${mY(1)};
  ${inlineBlock};
  ${uiShadow};
  &:hover {
    background-color: ${linkColor};
  }
  &:active {
    background-color: ${lighten(0.1, linkColor)};
  }
`;

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
        <Link css={signUpButtonStyle} to="/sign-up">
          立即加入
        </Link>
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
