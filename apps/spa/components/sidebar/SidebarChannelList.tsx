import { type ChannelWithMaybeMember } from '@boluo/api';
import { type FC, type ReactNode, useCallback, useMemo, useState } from 'react';
import { IsReorderingContext } from '../../hooks/useIsReordering';
import { SidebarChannelItem } from './SidebarChannelItem';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useQuerySpaceSettings } from '../../hooks/useQuerySpaceSettings';
import { SidebarChannelListSkeleton } from './SidebarChannelListSkeleton';
import { useMutateSpaceSettings } from '../../hooks/useMutateSpaceSettings';

interface Props {
  spaceId: string;
  isReordering: boolean;
  channelWithMemberList: ChannelWithMaybeMember[];
  activeChannelIds: string[];
  myId: string | null | undefined;
  archivedChannelIds: string[];
}

export const SidebarChannelList: FC<Props> = ({
  spaceId,
  channelWithMemberList: originalChannelWithMemberList,
  isReordering,
  activeChannelIds,
  myId,
  archivedChannelIds,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const { data: spaceSettings, isLoading } = useQuerySpaceSettings(spaceId);
  const { trigger } = useMutateSpaceSettings(spaceId);
  const channelWithMemberList = useMemo((): typeof originalChannelWithMemberList => {
    if (spaceSettings == null) return originalChannelWithMemberList;
    const { channelsOrder = [] } = spaceSettings;
    const reordered = channelsOrder.flatMap((id) => {
      const channel = originalChannelWithMemberList.find(({ channel }) => channel.id === id);
      return channel ? [channel] : [];
    });
    const notIncluded = originalChannelWithMemberList.filter(
      ({ channel }) => !channelsOrder.includes(channel.id),
    );
    return [...reordered, ...notIncluded];
  }, [originalChannelWithMemberList, spaceSettings]);

  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}));
  const modifiers = useMemo(() => [restrictToVerticalAxis, restrictToWindowEdges], []);
  const sortableItems = useMemo(
    () => channelWithMemberList.map(({ channel }) => channel.id),
    [channelWithMemberList],
  );
  const handleDragStart = useCallback(({ active }: DragStartEvent) => setActiveId(active.id), []);
  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { over, active } = e;
      setActiveId(null);
      if (!over) return;
      const overChannelIndex = channelWithMemberList.findIndex(
        ({ channel }) => channel.id === over.id,
      );
      const activeChannelIndex = channelWithMemberList.findIndex(
        ({ channel }) => channel.id === active.id,
      );
      if (
        overChannelIndex === -1 ||
        activeChannelIndex === -1 ||
        overChannelIndex === activeChannelIndex
      )
        return;
      const idList = channelWithMemberList.map(({ channel }) => channel.id);
      const [removed] = idList.splice(activeChannelIndex, 1);
      if (removed == null) return;
      idList.splice(overChannelIndex, 0, removed);
      const mergeWithArchived = (newActiveOrder: string[]) => {
        const baseOrder = spaceSettings?.channelsOrder;
        const archivedSet = new Set(archivedChannelIds);
        if (!baseOrder || baseOrder.length === 0) {
          return [...newActiveOrder, ...archivedChannelIds];
        }
        const result: string[] = [];
        const activeQueue = [...newActiveOrder];
        for (const id of baseOrder) {
          if (archivedSet.has(id)) {
            if (!result.includes(id)) result.push(id);
            continue;
          }
          if (activeQueue.length === 0) continue;
          if (id === activeQueue[0]) {
            result.push(activeQueue.shift()!);
          } else if (newActiveOrder.includes(id)) {
            const nextIndex = activeQueue.findIndex((nextId) => nextId === id);
            if (nextIndex !== -1) {
              result.push(...activeQueue.splice(0, nextIndex + 1));
            }
          }
        }
        for (const id of activeQueue) {
          if (!result.includes(id)) result.push(id);
        }
        for (const archived of archivedChannelIds) {
          if (!result.includes(archived)) result.push(archived);
        }
        return result;
      };
      const channelsOrder = mergeWithArchived(idList);
      const nextSettings: typeof spaceSettings = { ...spaceSettings, channelsOrder };
      void trigger(nextSettings, { optimisticData: nextSettings });
    },
    [archivedChannelIds, channelWithMemberList, spaceSettings, trigger],
  );
  const handleDragCancel = useCallback(() => setActiveId(null), []);
  const overlay: ReactNode = useMemo(() => {
    const activeChannel = channelWithMemberList.find(({ channel }) => channel.id === activeId);
    if (!activeChannel) return null;
    return (
      <SidebarChannelItem
        myId={myId}
        channel={activeChannel.channel}
        active={activeChannelIds.includes(activeChannel.channel.id)}
        overlay
      />
    );
  }, [activeId, activeChannelIds, channelWithMemberList, myId]);

  if (isLoading || spaceSettings == null) {
    return <SidebarChannelListSkeleton />;
  }
  return (
    <IsReorderingContext value={isReordering}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={modifiers}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={sortableItems}
          strategy={verticalListSortingStrategy}
          disabled={!isReordering}
        >
          {channelWithMemberList.map(({ channel }) => (
            <SidebarChannelItem
              myId={myId}
              key={channel.id}
              channel={channel}
              active={activeChannelIds.includes(channel.id)}
            />
          ))}
          <DragOverlay>{overlay}</DragOverlay>
        </SortableContext>
      </DndContext>
    </IsReorderingContext>
  );
};

export default SidebarChannelList;
