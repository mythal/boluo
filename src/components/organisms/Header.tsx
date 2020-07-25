import * as React from 'react';
import { css } from '@emotion/core';
import { headerBgColor, headerHeight, mainP, mainWidth, mR } from '../../styles/atoms';
import HeaderLink from '../atoms/HeaderLink';
import Icon from '../atoms/Icon';
import logo from '../../assets/logo.svg';
import { useProfile } from '../Provider';
import { ProfileState } from '../../reducers/profile';
import styled from '@emotion/styled';
import plus from '../../assets/icons/plus-circle.svg';
import cog from '../../assets/icons/cog.svg';

export const headerStyle = css`
  display: flex;
  align-items: center;
  justify-content: stretch;
  height: ${headerHeight};
  background-color: ${headerBgColor};
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.5);
`;

export const HeaderInner = styled.div`
  display: flex;
  flex: 1 1 auto;
  margin: 0 auto;
  ${mainWidth};
  justify-content: space-between;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
`;

function Guest() {
  return (
    <HeaderInner>
      <Nav>
        <HeaderLink css={mR(1)} exact to="/">
          <Icon css={mR(1)} sprite={logo} />
          菠萝
        </HeaderLink>
        <HeaderLink to="/space/explore">探索位面</HeaderLink>
      </Nav>
      <Nav>
        <HeaderLink css={mR(1)} to="/login">
          登录
        </HeaderLink>
        <HeaderLink to="/sign-up">注册</HeaderLink>
      </Nav>
    </HeaderInner>
  );
}

function User({ profile }: { profile: ProfileState }) {
  return (
    <HeaderInner>
      <Nav>
        <HeaderLink css={mR(1)} exact to="/">
          <Icon css={mR(1)} sprite={logo} />
          我的
        </HeaderLink>
        <HeaderLink css={mR(1)} to="/space/explore">
          探索位面
        </HeaderLink>
        <HeaderLink to="/space/new">
          <Icon sprite={plus} />
        </HeaderLink>
      </Nav>
      <Nav>
        <HeaderLink to="/profile" css={mR(1)} exact>
          {profile.user.nickname}
        </HeaderLink>
        <HeaderLink to="/settings" css={[mR(1)]}>
          <Icon sprite={cog} />
        </HeaderLink>
      </Nav>
    </HeaderInner>
  );
}

function Header() {
  const profile = useProfile();
  return <header css={[headerStyle, mainP]}>{profile ? <User profile={profile} /> : <Guest />}</header>;
}

export default Header;
