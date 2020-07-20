import * as React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { css } from '@emotion/core';
import {
  bgColor,
  color,
  floatRight,
  fontBold,
  headerBgColor,
  headerHeight,
  inlineBlock,
  link,
  linkColor,
  mainWidth,
  margin0Auto,
  mT,
  mY,
  p,
  pX,
  roundedPx,
  spacingN,
  text3Xl,
  textColor,
  textLg,
  textXl,
  uiShadow,
} from '../styles/atoms';
import logo from '../assets/logo.svg';
import { darken, lighten } from 'polished';
import Icon from './atoms/Icon';

interface Props {}

export const headerStyle = css`
  display: flex;
  align-items: center;
  justify-content: stretch;
  height: ${headerHeight};
  padding: 0 ${spacingN(4)};
  background-color: ${headerBgColor};
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.5);
`;

export const headerInnerStyle = css`
  display: flex;
  flex: 1 1 auto;
  margin: 0 auto;
  ${mainWidth};
  justify-content: space-between;
`;

export const headerNavStyle = css`
  a {
    margin-right: ${spacingN(1)};
    &:last-of-type {
      margin-right: 0;
    }
  }
`;

export const headerNavLinkStyle = css`
  color: ${textColor};
  text-decoration: none;
  padding: ${spacingN(1.5)} ${spacingN(2)};
  ${roundedPx}
  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }
  &.active {
    background-color: rgba(255, 255, 255, 0.15);
  }
`;

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

const welcomeStyle = css`
  ${mainWidth};
  ${margin0Auto};
`;

const featureListStyle = css`
  list-style-type: square;
`;

function GuestHome(props: Props) {
  console.log(logo);
  return (
    <div>
      <header css={headerStyle}>
        <div css={headerInnerStyle}>
          <nav css={headerNavStyle}>
            <NavLink css={headerNavLinkStyle} activeClassName="active" to="/">
              <Icon sprite={logo} />
              首页
            </NavLink>
            <NavLink css={headerNavLinkStyle} activeClassName="active" to="/spaces">
              寻找位面
            </NavLink>
          </nav>
          <nav css={headerNavStyle}>
            <NavLink css={headerNavLinkStyle} activeClassName="active" to="/login">
              登录
            </NavLink>
            <NavLink css={headerNavLinkStyle} activeClassName="active" to="/sign-up">
              注册
            </NavLink>
          </nav>
        </div>
      </header>
      <div css={[pX(8)]}>
        <div css={welcomeStyle}>
          <div>
            <svg css={[mY(8), floatRight]} width="14rem" height="14rem" viewBox={logo.viewBox}>
              <use xlinkHref={logo.url} />
            </svg>
            <h1 css={[text3Xl, mY(4)]}>菠萝</h1>
            <h2 css={[textXl, mY(2)]}>
              游玩
              <ruby>
                桌面角色扮演游戏<rt>Tabletop Role-Playing Game</rt>
              </ruby>
              、微酸香甜
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
            <ul css={featureListStyle}>
              <li>专门打造的文字为主 TPRG 工具</li>
              <li>实时预览，让文字输入像当面说话一样。</li>
              <li>开放的源代码和 API。</li>
              <li>即将到来的变量系统、回合指示器、战斗地图…</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(GuestHome);
