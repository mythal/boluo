import React, { useState } from 'react';
import { useMy } from '../Provider';
import { cls } from '../../classname';
import { UserMenu } from './UserMenu';
import { CreateSpace } from './CreateSpace';
import { ToggleButton } from './ToggleButton';
import { LoginButton } from './LoginButton';
import { SpaceList } from '../SpaceList';
import { Tooltip } from '../Tooltip';
import { SearchIcon } from '../icons';
import { Link, NavLink } from 'react-router-dom';

interface Props {}

export const Sidebar = React.memo<Props>(({}) => {
  const my = useMy();
  const [expand, setExpand] = useState<boolean>(localStorage.getItem('sidebar') !== null);
  const toggleSidebar = () => {
    if (expand) {
      localStorage.removeItem('sidebar');
    } else {
      localStorage.setItem('sidebar', 'true');
    }
    setExpand(!expand);
  };
  return (
    <div
      className={cls('w-12 flex-0-auto flex flex-col bg-gray-200 h-full border-r transition-all duration-500', {
        'w-40': expand,
      })}
    >
      {my === 'GUEST' ? (
        <LoginButton />
      ) : (
        <>
          <div className="w-full text-right">
            <ToggleButton toggle={toggleSidebar} expand={expand} />
          </div>
          <div className="flex-1 w-full overflow-y-scroll ">{expand && <SpaceList my={my} />}</div>
          <div className="w-full text-right"></div>
          <div className={cls('w-full flex', expand ? 'justify-between p-2' : ' flex-col')}>
            <Tooltip message={<div>寻找位面</div>}>
              <NavLink exact className="sidebar-btn inline-block" activeClassName="sidebar-btn-down" to="/">
                <SearchIcon />
              </NavLink>
            </Tooltip>
            <CreateSpace />
            <UserMenu profile={my.profile} />
          </div>
        </>
      )}
    </div>
  );
});
