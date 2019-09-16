import { Injectable } from '@nestjs/common';
import { Message } from '../messages/messages.entity';
import { PreviewMessage } from '../messages/PreviewMessage';
import { RedisService } from '../redis/redis.service';
import { generateId } from 'boluo-common';
import { ChannelEvent } from './ChannelEvent';
import { pubSub } from './pubSub';

@Injectable()
export class EventService {
  constructor(private readonly redisService: RedisService) {}

  static triggerIdKey(id: string) {
    return `trigger:${id}:id`;
  }

  async newMessage(message: Message) {
    const channelEvent = new ChannelEvent(message.channelId);
    channelEvent.newMessage = message;
    const trigger = await this.getTriggerId(message.channelId);
    return pubSub.publish(trigger, { channelEvent });
  }

  async messageDeleted(channelId: string, id: string) {
    const channelEvent = new ChannelEvent(channelId);
    channelEvent.messageDeleted = id;
    const trigger = await this.getTriggerId(channelId);
    return pubSub.publish(trigger, { channelEvent });
  }

  async messageEdited(message: Message) {
    const channelEvent = new ChannelEvent(message.channelId);
    channelEvent.messageEdited = message;
    const trigger = await this.getTriggerId(message.channelId);
    return pubSub.publish(trigger, { channelEvent });
  }

  async messagePreview(message: PreviewMessage) {
    const channelEvent = new ChannelEvent(message.channelId);
    channelEvent.messagePreview = message;
    const trigger = await this.getTriggerId(message.channelId);
    return pubSub.publish(trigger, { channelEvent });
  }

  // publish this event when public channel convert to private channel, or someone is banned.
  async needResubscribe(channelId: string) {
    await this.getTriggerId(channelId, true);
    const channelEvent = new ChannelEvent(channelId);
    channelEvent.needResubscribe = true;
    const trigger = await this.getTriggerId(channelId, true);
    return pubSub.publish(trigger, { channelEvent });
  }

  async channelDeleted(channelId: string) {
    const trigger = await this.getTriggerId(channelId);
    const channelEvent = new ChannelEvent(channelId);
    channelEvent.channelDeleted = true;
    await pubSub.publish(trigger, { channelEvent });
    const key = EventService.triggerIdKey(channelId);
    await this.redisService.client.del(key);
  }

  async getTriggerId(id: string, reset: boolean = false): Promise<string> {
    const key = EventService.triggerIdKey(id);
    if (reset) {
      await this.redisService.client.set(key, generateId());
    } else {
      await this.redisService.client.setnx(key, generateId());
    }
    return (await this.redisService.get(key)) as string;
  }
}
