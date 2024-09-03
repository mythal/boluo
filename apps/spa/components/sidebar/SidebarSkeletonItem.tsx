import { LoadingText } from '@boluo/ui/LoadingText';
import { SidebarItem } from './SidebarItem';

const nop = () => {
  // no-op
};
export const SidebarSkeletonItem = () => {
  return (
    <SidebarItem onClick={nop}>
      <LoadingText />
    </SidebarItem>
  );
};
