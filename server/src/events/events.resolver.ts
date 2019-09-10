import { PubSub } from 'graphql-subscriptions';
import { Field, ID, ObjectType } from 'type-graphql';
import { Message } from '../messages/messages.entity';
import { PreviewMessage } from '../messages/PreviewMessage';
import { Args, Resolver, Subscription } from '@nestjs/graphql';

export const pubSub = new PubSub();

@ObjectType()
export class ChannelEvent {
  @Field(() => Message, { nullable: true })
  newMessage?: Message;

  @Field(() => ID, { nullable: true })
  messageDeleted?: string;

  @Field(() => Message, { nullable: true })
  messageEdited?: Message;

  @Field(() => PreviewMessage, { nullable: true })
  messagePreview?: PreviewMessage;

  @Field(() => Date)
  publishTime: Date;

  @Field(() => ID)
  channelId: string;

  constructor(channelId: string) {
    this.channelId = channelId;
    this.publishTime = new Date();
  }
}

export const TRIGGER = 'channelEvent';

const filter = ({ channelEvent }: { channelEvent: ChannelEvent }, { channelId }: { channelId: string }) =>
  channelEvent.channelId === channelId;

@Resolver(() => ChannelEvent)
export class ChannelEventResolver {
  @Subscription(() => ChannelEvent, { filter })
  channelEvent(@Args({ name: 'channelId', type: () => ID }) channelId: string) {
    return pubSub.asyncIterator(TRIGGER);
  }
}
