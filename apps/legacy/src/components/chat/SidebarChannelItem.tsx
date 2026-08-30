import * as React from 'react';
import { type Channel } from '../../api/channels';
import Lock from '@boluo/icons/legacy/Lock';
import { useSelector } from '../../store';
import { chatPath } from '../../utils/path';
import Icon from '../atoms/Icon';
import { SidebarItemLink } from '../atoms/SidebarItem';

interface Props {
  channel: Channel;
}

export function SidebarChannelItem({ channel }: Props) {
  const latestMessage = useSelector((state) => {
    return state.chatStates.get(channel.id)?.itemSet.messages.last();
  });
  let name: string | null = null;
  let text: string | null = null;
  if (latestMessage) {
    switch (latestMessage.type) {
      case 'MESSAGE':
        text = latestMessage.message.text;
        name = latestMessage.message.name;
        break;
      case 'PREVIEW':
        text = latestMessage.preview.text ?? null;
        name = latestMessage.preview.name;
        break;
    }
  }
  return (
    <SidebarItemLink multiline to={chatPath(channel.spaceId, channel.id)}>
      <div className="before:font-legacy-mono before:text-legacy-gray-500 relative before:absolute before:-left-[1em] before:content-['#']">
        {!channel.isPublic && <Icon className="mr-1" icon={Lock} />}
        {channel.name}
      </div>
      {channel.isPublic && name && text && (
        <div className="text-legacy-gray-600 text-[0.875rem]">
          <span className="italic">{name}:</span> {text}
        </div>
      )}
    </SidebarItemLink>
  );
}
