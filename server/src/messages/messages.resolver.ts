import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { Message, MessageType } from './messages.entity';
import { MessageService } from './messages.service';
import { Field, ID, ObjectType } from 'type-graphql';
import { CurrentUser } from '../decorators';
import { JwtUser } from '../auth/jwt.strategy';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/auth.guard';
import { PubSub } from 'apollo-server-express';

const pubSub = new PubSub();

const NEW_MESSAGE = 'newMessage';
const PREVIEW_MESSAGE = 'messagePreview';
const MESSAGE_DELETED = 'messageDeleted';
const MESSAGE_EDITED = 'messageEdited';

@ObjectType()
class PreviewMessage {
  @Field(() => ID)
  id: string;

  @Field(() => MessageType)
  type: MessageType;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  channelId: string;

  @Field()
  charName: string;

  @Field({ description: 'Message plain text.' })
  content: string;

  @Field({ nullable: false })
  startTime: Date;

  @Field({ nullable: false })
  updateTime: Date;
}

@Resolver(() => Message)
export class MessageResolver {
  constructor(private messageService: MessageService) {}

  @Query(() => [Message], { description: 'Get all messages.' })
  async messages() {
    return await this.messageService.findAll();
  }

  @Query(() => Message)
  async getMessageById(@Args({ name: 'id', type: () => ID }) id: string) {
    return await this.messageService.findById(id);
  }

  @Mutation(() => Message)
  @UseGuards(GqlAuthGuard)
  async sendMessage(
    @Args({ name: 'id', type: () => ID }) id: string,
    @Args('content') content: string,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args('charName') charName: string,
    @Args({ name: 'type', type: () => MessageType }) type: MessageType,
    @CurrentUser() user: JwtUser
  ) {
    if (content.trim().length === 0) {
      throw Error('Empty message');
    }
    const message = await this.messageService.create(id, content, channelId, charName, user.id, type);
    if (message) {
      pubSub.publish(NEW_MESSAGE, { [NEW_MESSAGE]: message }).catch(console.error);
    }
    return message;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async updatePreviewMessage(
    @Args({ name: 'id', type: () => ID }) id: string,
    @Args('content') content: string,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args('charName') charName: string,
    @Args({ name: 'type', type: () => MessageType }) type: MessageType,
    @Args({ name: 'startTime', type: () => Date }) startTime: Date,
    @CurrentUser() user: JwtUser
  ) {
    if (content.trim().length === 0) {
      return false;
    }
    const message = new PreviewMessage();
    message.channelId = channelId;
    message.charName = charName;
    message.type = MessageType.SAY;
    message.userId = user.id;
    message.id = id;
    message.content = content;
    message.startTime = startTime;
    message.updateTime = new Date();
    if (message) {
      pubSub.publish(PREVIEW_MESSAGE, { [PREVIEW_MESSAGE]: message }).catch(console.error);
      return true;
    } else {
      return false;
    }
  }

  @Mutation(() => Message)
  @UseGuards(GqlAuthGuard)
  async editMessage(
    @CurrentUser() user: JwtUser,
    @Args('messageId') messageId: string,
    @Args('content') content: string
  ) {
    const message = await this.messageService.findById(messageId);
    if (!message || message.deleted) {
      throw Error('No message found');
    }
    if (message.userId !== user.id) {
      throw Error('No editing authority');
    }
    message.content = content;
    const savedMessage = await this.messageService.saveMassage(message);
    pubSub.publish(MESSAGE_EDITED, savedMessage).catch(console.error);
    return savedMessage;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteMessage(@CurrentUser() user: JwtUser, @Args('messageId') messageId: string) {
    const message = await this.messageService.findById(messageId);
    if (!message) {
      throw Error('No message found');
    }
    if (message.userId !== user.id) {
      throw Error('No editing authority');
    }
    if (message.deleted) {
      throw Error('Already deleted');
    }
    message.deleted = true;
    await this.messageService.saveMassage(message);
    pubSub.publish(MESSAGE_DELETED, { [MESSAGE_DELETED]: message.id }).catch(console.error);
    return true;
  }

  @Subscription(() => Message)
  newMessage() {
    return pubSub.asyncIterator(NEW_MESSAGE);
  }

  @Subscription(() => PreviewMessage)
  messagePreview() {
    return pubSub.asyncIterator(PREVIEW_MESSAGE);
  }

  @Subscription(() => ID)
  messageDeleted() {
    return pubSub.asyncIterator(MESSAGE_DELETED);
  }

  @Subscription(() => Message)
  messageEdited() {
    return pubSub.asyncIterator(MESSAGE_EDITED);
  }
}
