import { Injectable } from '@nestjs/common';
import { Message } from '../messages/messages.entity';
import { ChannelEvent, pubSub, TRIGGER } from './events.resolver';
import { PreviewMessage } from '../messages/PreviewMessage';

@Injectable()
export class EventService {
  newMessage = (message: Message) => {
    const channelEvent = new ChannelEvent(message.channelId);
    channelEvent.newMessage = message;
    return pubSub.publish(TRIGGER, { channelEvent });
  };

  messageDeleted = (channelId: string, id: string) => {
    const channelEvent = new ChannelEvent(channelId);
    channelEvent.messageDeleted = id;
    return pubSub.publish(TRIGGER, { channelEvent });
  };

  messageEdited = (message: Message) => {
    const channelEvent = new ChannelEvent(message.channelId);
    channelEvent.messageEdited = message;
    return pubSub.publish(TRIGGER, { channelEvent });
  };

  messagePreview = (message: PreviewMessage) => {
    const channelEvent = new ChannelEvent(message.channelId);
    channelEvent.messagePreview = message;
    return pubSub.publish(TRIGGER, { channelEvent });
  };
}
