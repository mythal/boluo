import * as React from 'react';
import { useRef, useState } from 'react';
import ChevronDown from '@boluo/icons/legacy/ChevronDown';
import ChevronUp from '@boluo/icons/legacy/ChevronUp';
import Cog from '@boluo/icons/legacy/Cog';
import Logout from '@boluo/icons/legacy/Logout';
import PlusCircle from '@boluo/icons/legacy/PlusCircle';
import Logo from '@boluo/icons/legacy/Logo';
import { useIsLoggedIn } from '../../hooks/useIsLoggedIn';
import { useSelector } from '../../store';
import { recordNext } from '../../utils/browser';
import HeaderLink, { HeaderButton } from '../atoms/HeaderLink';
import Icon from '../atoms/Icon';
import Menu from '../atoms/Menu';
import { MenuItemLink } from '../atoms/MenuItem';
import Overlay from '../atoms/Overlay';

export const headerClassName =
  'flex h-12 items-center justify-stretch bg-legacy-header-background px-6 py-4 shadow-[0_-1px_4px_rgba(0,0,0,0.5)]';

export function HeaderInner({ children }: React.PropsWithChildren) {
  return <div className="mx-auto flex max-w-[50em] flex-auto justify-between">{children}</div>;
}

function Nav({ children }: React.PropsWithChildren) {
  return <nav className="flex items-center">{children}</nav>;
}

function Guest() {
  return (
    <HeaderInner>
      <Nav>
        <HeaderLink className="mr-1" exact to="/">
          <Icon className="mr-1" icon={Logo} />
          菠萝
        </HeaderLink>
        <HeaderLink to="/space/explore">探索位面</HeaderLink>
      </Nav>
      <Nav>
        <HeaderLink className="mr-1" to="/login" onClick={recordNext}>
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
        <HeaderLink className="mr-1" exact to="/">
          <Icon className="mr-1" icon={Logo} />
          我的
        </HeaderLink>
        <HeaderLink className="mr-1" to="/space/explore">
          探索位面
        </HeaderLink>
        <HeaderLink to="/space/new">
          <Icon icon={PlusCircle} />
        </HeaderLink>
      </Nav>
      <Nav>
        <HeaderButton onClick={toggle} ref={menuAnchor}>
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
  return <header className={headerClassName}>{isLoggedIn ? <User /> : <Guest />}</header>;
}

export default Header;
