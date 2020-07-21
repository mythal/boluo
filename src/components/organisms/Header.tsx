import * as React from 'react';
import { css } from '@emotion/core';
import { headerBgColor, headerHeight, mainP, mainWidth, mR, spacingN } from '../../styles/atoms';
import HeaderLink from '../atoms/HeaderLink';
import Icon from '../atoms/Icon';
import logo from '../../assets/logo.svg';

export const headerStyle = css`
  display: flex;
  align-items: center;
  justify-content: stretch;
  height: ${headerHeight};
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

function Header() {
  return (
    <header css={[headerStyle, mainP]}>
      <div css={headerInnerStyle}>
        <nav>
          <HeaderLink css={mR(1)} exact to="/">
            <Icon css={mR(1)} sprite={logo} />
            首页
          </HeaderLink>
          <HeaderLink to="/spaces">寻找位面</HeaderLink>
        </nav>
        <nav>
          <HeaderLink css={mR(1)} to="/login">
            登录
          </HeaderLink>
          <HeaderLink to="/sign-up">注册</HeaderLink>
        </nav>
      </div>
    </header>
  );
}

export default Header;
