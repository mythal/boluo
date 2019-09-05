import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { Message } from './messages.entity';
import { MessageService } from './messages.service';
import { Field, ID, ObjectType } from 'type-graphql';
import { CurrentUser } from '../decorators';
import { JwtUser } from '../auth/jwt.strategy';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/auth.guard';
import { PubSub } from 'apollo-server-express';

const pubSub = new PubSub();

const NEW_MESSAGE = 'newMessage';
const MESSAGE_PREVIEW = 'messagePreview';
const MESSAGE_DELETED = 'messageDeleted';
const MESSAGE_EDITED = 'messageEdited';

@ObjectType()
class PreviewMessage {
  @Field(() => ID)
  id: string;

  @Field(() => Boolean)
  isRoll: boolean;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  channelId: string;

  @Field()
  character: string;

  @Field()
  source: string;

  @Field({ nullable: false })
  startTime: Date;

  @Field({ nullable: false })
  updateTime: Date;

  @Field({ nullable: false })
  justTyping: boolean;
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
    @Args('source') source: string,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args('character') character: string,
    @Args({ name: 'isRoll', type: () => Boolean, defaultValue: false }) isRoll: boolean,
    @CurrentUser() user: JwtUser
  ) {
    if (source.trim().length === 0) {
      throw Error('Empty message');
    }
    const message = await this.messageService.create(id, source, channelId, character.trim(), user.id, isRoll);
    if (message) {
      await pubSub.publish(NEW_MESSAGE, { [NEW_MESSAGE]: message });
    }
    return message;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async sendMessagePreview(
    @Args({ name: 'id', type: () => ID }) id: string,
    @Args('source') source: string,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args('character') character: string,
    @Args({ name: 'startTime', type: () => Date }) startTime: Date,
    @Args({ name: 'justTyping', type: () => Boolean, defaultValue: false }) justTyping: boolean,
    @Args({ name: 'isRoll', type: () => Boolean, defaultValue: false }) isRoll,
    @CurrentUser() user: JwtUser
  ) {
    const message = new PreviewMessage();
    message.channelId = channelId;
    message.character = character;
    message.userId = user.id;
    message.isRoll = isRoll;
    message.id = id;
    message.source = source;
    message.startTime = startTime;
    message.updateTime = new Date();
    message.justTyping = justTyping;
    if (message) {
      await pubSub.publish(MESSAGE_PREVIEW, { [MESSAGE_PREVIEW]: message });
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
    @Args('source') source: string
  ) {
    const message = await this.messageService.findById(messageId);
    if (!message || message.deleted) {
      throw Error('No message found');
    }
    if (message.userId !== user.id) {
      throw Error('No editing authority');
    }
    message.source = source;
    const savedMessage = await this.messageService.saveMassage(message);
    pubSub.publish(MESSAGE_EDITED, savedMessage).catch(console.error);
    return savedMessage;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteMessage(@CurrentUser() user: JwtUser, @Args({ name: 'messageId', type: () => ID }) messageId: string) {
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
    return pubSub.asyncIterator(MESSAGE_PREVIEW);
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
