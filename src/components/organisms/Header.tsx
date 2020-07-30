import * as React from 'react';
import { css } from '@emotion/core';
import { headerBgColor, headerHeight, mainP, mainWidth, mR } from '../../styles/atoms';
import HeaderLink, { HeaderButton } from '../atoms/HeaderLink';
import Icon from '../atoms/Icon';
import logo from '../../assets/logo.svg';
import { useProfile } from '../Provider';
import { ProfileState } from '../../reducers/profile';
import styled from '@emotion/styled';
import plus from '../../assets/icons/plus-circle.svg';
import cog from '../../assets/icons/cog.svg';
import chevronDown from '../../assets/icons/chevron-down.svg';
import chevronUp from '../../assets/icons/chevron-up.svg';
import { useRef, useState } from 'react';
import Menu, { IMenuItem } from '../atoms/Menu';
import Overlay from '../atoms/Overlay';
import logoutIcon from '../../assets/icons/logout.svg';
import { useHistory } from 'react-router-dom';
import { useLogout } from '../../hooks';

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
  const [menu, setMenu] = useState(false);
  const menuAnchor = useRef<HTMLButtonElement | null>(null);
  const history = useHistory();
  const logout = useLogout();
  const toggle = () => setMenu((open) => !open);
  const dismiss = () => setMenu(false);

  const menuItems: IMenuItem[] = [
    { text: '个人资料页', callback: () => history.push('/profile') },
    { text: '设置', callback: () => history.push('/settings'), icon: cog },
    { text: '登出', callback: logout, icon: logoutIcon },
  ];
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
        <HeaderButton css={mR(1)} onClick={toggle} ref={menuAnchor}>
          {profile.user.nickname} <Icon sprite={menu ? chevronUp : chevronDown} />
        </HeaderButton>
        {menu && (
          <Overlay x={1} y={1} selfY={1} selfX={-1} anchor={menuAnchor} onOuter={dismiss}>
            <Menu dismiss={dismiss} items={menuItems} />
          </Overlay>
        )}
      </Nav>
    </HeaderInner>
  );
}

function Header() {
  const profile = useProfile();
  return <header css={[headerStyle, mainP]}>{profile ? <User profile={profile} /> : <Guest />}</header>;
}

export default Header;
