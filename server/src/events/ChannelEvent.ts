import { Field, ID, ObjectType } from 'type-graphql';
import { Message } from '../messages/messages.entity';
import { PreviewMessage } from '../messages/PreviewMessage';

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

  @Field(() => Boolean, { nullable: true })
  channelDeleted?: boolean;

  @Field(() => Boolean, { nullable: true })
  needResubscribe?: boolean;

  @Field(() => Date)
  publishTime: Date;

  @Field(() => ID)
  channelId: string;

  constructor(channelId: string) {
    this.channelId = channelId;
    this.publishTime = new Date();
  }
}
