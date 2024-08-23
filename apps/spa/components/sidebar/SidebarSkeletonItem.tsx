import { SidebarItem } from './SidebarItem';

const nop = () => {
  // no-op
};
export const SidebarSkeletonItem = () => {
  return (
    <SidebarItem onClick={nop}>
      <span className="animate-pulse">Loading...</span>
    </SidebarItem>
  );
};
