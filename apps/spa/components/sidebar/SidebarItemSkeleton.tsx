import { SidebarItem } from './SidebarItem';

const nop = () => {
  // no-op
};
const SkeletonItem = () => {
  return (
    <SidebarItem onClick={nop}>
      <span className="text-surface-300 animate-ping">...</span>
    </SidebarItem>
  );
};

export const SidebarItemSkeleton = () => {
  return (
    <>
      <SkeletonItem />
      <SkeletonItem />
    </>
  );
};
