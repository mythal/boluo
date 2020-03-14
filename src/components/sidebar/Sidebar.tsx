import React, { useState } from 'react';
import { useProfile } from '../Provider';
import { cls } from '../../classname';
import { UserMenu } from './UserMenu';
import { CreateSpace } from './CreateSpace';
import { ToggleButton } from './ToggleButton';
import { LoginButton } from './LoginButton';
import { SpaceList } from '../SpaceList';
import { FindSpaceButton } from './FindSpaceButton';

interface Props {}

export const Sidebar = React.memo<Props>(() => {
  const profile = useProfile();
  const [expand, setExpand] = useState<boolean>(localStorage.getItem('sidebar') !== null);
  const toggleSidebar = () => {
    if (expand) {
      localStorage.removeItem('sidebar');
    } else {
      localStorage.setItem('sidebar', 'true');
    }
    setExpand(!expand);
  };

  const content = profile ? (
    <div>
      <ToggleButton toggle={toggleSidebar} expand={expand} />
    </div>
  ) : (
    <div></div>
  );

  return (
    <div
      className={cls('w-12 flex-0-auto flex flex-col bg-gray-800 h-full text-white', {
        'w-40': expand,
      })}
    >
      {content}
      {/*{profile === undefined ? (*/}
      {/*  <LoginButton />*/}
      {/*) : (*/}
      {/*  <>*/}
      {/*    <div className="w-full text-right">*/}
      {/*      <ToggleButton toggle={toggleSidebar} expand={expand} />*/}
      {/*    </div>*/}
      {/*    <div className="flex-1 w-full overflow-y-scroll ">{expand && <SpaceList profile={profile} />}</div>*/}
      {/*    <div className={cls('w-full flex', expand ? 'justify-between p-2' : ' flex-col')}>*/}
      {/*      <FindSpaceButton />*/}
      {/*      <CreateSpace />*/}
      {/*      <UserMenu profile={profile.user} />*/}
      {/*    </div>*/}
      {/*  </>*/}
      {/*)}*/}
    </div>
  );
});
