import { SidebarItem } from './SidebarItem';

const nop = () => {
  // no-op
};
const SkeletonItem = () => {
  return (
    <SidebarItem onClick={nop}>
      <span className="animate-ping text-surface-300">...</span>
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
