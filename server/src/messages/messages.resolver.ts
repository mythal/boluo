import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Message, MessageType } from './messages.entity';
import { MessageService } from './messages.service';
import { ID } from 'type-graphql';
import { CurrentUser } from '../decorators';
import { JwtUser } from '../auth/jwt.strategy';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/auth.guard';

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
    return await this.messageService.create(id, content, channelId, charName, user.id, type);
  }

  @Mutation(() => Message)
  @UseGuards(GqlAuthGuard)
  async editMessage(
    @CurrentUser() user: JwtUser,
    @Args('messageId') messageId: string,
    @Args('content') content: string
  ) {
    const message = await this.messageService.findById(messageId);
    if (!message) {
      throw Error('No message found');
    }
    if (message.userId !== user.id) {
      throw Error('No editing authority');
    }
    message.content = content;
    return this.messageService.saveMassage(message);
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
    return true;
  }
}
