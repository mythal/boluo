import React from 'react';
import { NavLink } from 'react-router-dom';
import { SearchIcon } from '../icons';
import { Tooltip } from '../Tooltip';

interface Props {}

export const FindSpaceButton = React.memo<Props>(() => {
  return (
    <Tooltip message={<div>寻找位面</div>}>
      <NavLink exact className="sidebar-btn inline-block" activeClassName="sidebar-btn-down" to="/">
        <SearchIcon />
      </NavLink>
    </Tooltip>
  );
});
