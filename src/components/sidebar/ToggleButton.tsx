import React from 'react';
import { SidebarButton } from './SidebarButton';

interface Props {
  toggle: () => void;
  expand: boolean;
}

export const ToggleButton = React.memo<Props>(({ toggle, expand }) => {
  return <SidebarButton iconName="bars" text="折叠" expand={expand} onClick={toggle} />;
});
