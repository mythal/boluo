export const SidebarChannelListSkeleton = () => {
  return (
    <div className="flex flex-col gap-2 px-4" aria-hidden>
      <div className="bg-sidebar-channels-placeholder-random2 h-[52px] animate-pulse rounded"></div>
      <div className="bg-sidebar-channels-placeholder-random1 h-[52px] animate-pulse rounded"></div>
      <div className="bg-sidebar-channels-placeholder-random3 h-[52px] animate-pulse rounded"></div>
    </div>
  );
};
