import { css } from '@emotion/react';
import styled from '@emotion/styled';
import * as React from 'react';
import { useRef, useState } from 'react';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import ChevronUp from '../../assets/icons/chevron-up.svg';
import Cog from '../../assets/icons/cog.svg';
import Logout from '../../assets/icons/logout.svg';
import PlusCircle from '../../assets/icons/plus-circle.svg';
import Logo from '../../assets/logo.svg';
import { useIsLoggedIn } from '../../hooks/useIsLoggedIn';
import { useSelector } from '../../store';
import { headerHeight, headerShadow, mainP, mainWidth, mR } from '../../styles/atoms';
import { headerBgColor } from '../../styles/colors';
import { recordNext } from '../../utils/browser';
import HeaderLink, { HeaderButton } from '../atoms/HeaderLink';
import Icon from '../atoms/Icon';
import Menu from '../atoms/Menu';
import { MenuItemLink } from '../atoms/MenuItem';
import Overlay from '../atoms/Overlay';

export const headerStyle = css`
  display: flex;
  align-items: center;
  justify-content: stretch;
  height: ${headerHeight};
  background-color: ${headerBgColor};
  ${headerShadow};
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
          <Icon css={mR(1)} icon={Logo} />
          菠萝
        </HeaderLink>
        <HeaderLink to="/space/explore">探索位面</HeaderLink>
      </Nav>
      <Nav>
        <HeaderLink css={mR(1)} to="/login" onClick={recordNext}>
          登录
        </HeaderLink>
        <HeaderLink to="/sign-up" onClick={recordNext}>
          注册
        </HeaderLink>
      </Nav>
    </HeaderInner>
  );
}

function User() {
  const [menu, setMenu] = useState(false);
  const menuAnchor = useRef<HTMLButtonElement | null>(null);
  const nickname = useSelector((state) => state.profile?.user.nickname);
  const toggle = () => setMenu((open) => !open);
  const dismiss = () => setMenu(false);

  return (
    <HeaderInner>
      <Nav>
        <HeaderLink css={mR(1)} exact to="/">
          <Icon css={mR(1)} icon={Logo} />
          我的
        </HeaderLink>
        <HeaderLink css={mR(1)} to="/space/explore">
          探索位面
        </HeaderLink>
        <HeaderLink to="/space/new">
          <Icon icon={PlusCircle} />
        </HeaderLink>
      </Nav>
      <Nav>
        <HeaderButton css={mR(1)} onClick={toggle} ref={menuAnchor}>
          {nickname} <Icon icon={menu ? ChevronUp : ChevronDown} />
        </HeaderButton>
        {menu && (
          <Overlay x={1} y={1} selfY={1} selfX={-1} anchor={menuAnchor} onOuter={dismiss}>
            <Menu dismiss={dismiss}>
              <MenuItemLink to="/profile">个人资料页</MenuItemLink>
              <MenuItemLink to="/settings" icon={Cog}>
                设置
              </MenuItemLink>
              <MenuItemLink to="/logout" icon={Logout}>
                登出
              </MenuItemLink>
            </Menu>
          </Overlay>
        )}
      </Nav>
    </HeaderInner>
  );
}

function Header() {
  const isLoggedIn = useIsLoggedIn();
  return <header css={[headerStyle, mainP]}>{isLoggedIn ? <User /> : <Guest />}</header>;
}

export default Header;
