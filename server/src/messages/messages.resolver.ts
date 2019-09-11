import { Args, Mutation, Query, ResolveProperty, Resolver, Root } from '@nestjs/graphql';
import { Message } from './messages.entity';
import { MessageService } from './messages.service';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { CurrentUser } from '../decorators';
import { JwtUser } from '../auth/jwt.strategy';
import { Logger, UseGuards } from '@nestjs/common';
import { GraphQLJSONObject } from 'graphql-type-json';
import { GqlAuthGuard } from '../auth/auth.guard';
import { ForbiddenError, UserInputError } from 'apollo-server-express';
import { generateId } from '../utils';
import { Entity as MessageEntity } from '../common/entities';
import { checkCharacterName, checkMessage, parse } from '../common';
import { PreviewMessage } from './PreviewMessage';
import { EventService } from '../events/events.service';
import { MemberService } from '../members/members.service';

@ObjectType()
class Content {
  @Field()
  text: string;

  @Field(() => GraphQLJSONObject)
  entities: MessageEntity[];

  @Field(() => Int)
  seed: number;
}

@Resolver(() => Message)
export class MessageResolver {
  private readonly logger = new Logger(MessageResolver.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly eventService: EventService,
    private readonly memberService: MemberService
  ) {}

  @Query(() => Message)
  async getMessageById(@Args({ name: 'id', type: () => ID }) id: string) {
    return await this.messageService.findById(id);
  }

  @ResolveProperty(() => String)
  async text(@Root() message: Message) {
    return message.isPublic() ? message.text : '';
  }

  @ResolveProperty(() => GraphQLJSONObject)
  async entities(@Root() message: Message) {
    return message.isPublic() ? message.entities : [];
  }

  @ResolveProperty(() => Number)
  async seed(@Root() message: Message) {
    return message.isPublic() ? message.seed : 0;
  }

  @Query(() => Content, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async actuallyContent(@Args({ name: 'id', type: () => ID }) id: string, @CurrentUser() user: JwtUser) {
    const message = await this.messageService.findById(id);
    if (!message) {
      throw new UserInputError('No message found');
    }
    const content = new Content();
    content.entities = message.entities;
    content.seed = message.seed;
    content.text = message.text;
    if (await this.messageService.canRead(message, user.id)) {
      return content;
    } else {
      this.logger.warn(`A user (${user.id}) tried to read non-public message.`);
      throw new ForbiddenError('No permission to view.');
    }
  }

  @Mutation(() => Message, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async sendMessage(
    @CurrentUser() user: JwtUser,
    @Args({ name: 'text', type: () => String }) text: string,
    @Args({ name: 'entities', type: () => [GraphQLJSONObject] }) entities: MessageEntity[],
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'character', type: () => String }) character: string,
    @Args({ name: 'hide', type: () => Boolean, defaultValue: false }) isHidden: boolean,
    @Args({ name: 'whisperTo', type: () => [ID], defaultValue: [] }) whisperTo: string[],
    @Args({ name: 'id', type: () => ID, nullable: true }) id?: string
  ) {
    if (!id) {
      id = generateId();
    }
    const [isNameValid, nameReason] = checkCharacterName(character);
    const [isValid, reason] = checkMessage(text, entities);
    if (!isValid || !isNameValid) {
      throw new UserInputError(reason || nameReason);
    }
    const message = await this.messageService.create(
      id,
      text,
      entities,
      channelId,
      character.trim(),
      user.id,
      isHidden,
      whisperTo
    );
    await this.eventService.newMessage(message);
    return message;
  }

  @Mutation(() => Message, { deprecationReason: "Don't use, just for development." })
  @UseGuards(GqlAuthGuard)
  async sendMessageSource(
    @CurrentUser() user: JwtUser,
    @Args({ name: 'source', type: () => String }) source: string,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'character', type: () => String }) character: string,
    @Args({ name: 'isExpression', type: () => Boolean, defaultValue: true }) isExpression: boolean,
    @Args({ name: 'hide', type: () => Boolean, defaultValue: false }) isHidden: boolean,
    @Args({ name: 'whisperTo', type: () => [ID], defaultValue: [] }) whisperTo: string[],
    @Args({ name: 'id', type: () => ID, nullable: true }) id?: string
  ) {
    const { text, entities } = parse(source, isExpression);
    return this.sendMessage(user, text, entities, channelId, character, isHidden, whisperTo, id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async sendMessagePreview(
    @Args({ name: 'id', type: () => ID }) id: string,
    @Args({ name: 'source', type: () => String, description: 'If blank, just show typing.' })
    source: string,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'character', type: () => String, description: 'If blank, this is a Out-of-Character message.' })
    character: string,
    @Args({ name: 'startTime', type: () => Date }) startTime: Date,
    @Args({ name: 'isExpression', type: () => Boolean, defaultValue: false }) isExpression: boolean,
    @CurrentUser() user: JwtUser
  ) {
    const PREVIEW_SOURCE_MAX_LENGTH = 1024;
    character = character.trim();

    const [isNameValid, nameReason] = checkCharacterName(character);
    if (!isNameValid) {
      throw new UserInputError(nameReason);
    }

    const message = new PreviewMessage();
    message.channelId = channelId;
    message.character = character;
    message.userId = user.id;
    message.isExpression = isExpression;
    message.id = id;
    message.source = source.length < PREVIEW_SOURCE_MAX_LENGTH ? source : '';
    message.startTime = startTime;
    message.updateTime = new Date();
    await this.eventService.messagePreview(message);
    return true;
  }

  @Mutation(() => Message)
  @UseGuards(GqlAuthGuard)
  async editMessage(
    @CurrentUser() user: JwtUser,
    @Args({ name: 'messageId', type: () => String }) messageId: string,
    @Args({ name: 'text', type: () => String }) text: string,
    @Args({ name: 'entities', type: () => [GraphQLJSONObject] }) entities: MessageEntity[],
    @Args({ name: 'character', type: () => String, nullable: true }) character?: string
  ) {
    const message = await this.messageService.findById(messageId);
    if (!message || message.deleted) {
      throw new UserInputError('No message found');
    }
    if (message.senderId !== user.id) {
      throw new ForbiddenError('No editing authority');
    }
    if (character) {
      character = character.trim();
      const [isNameValid, nameReason] = checkCharacterName(character);
      if (!isNameValid) {
        throw new UserInputError(nameReason);
      }
    }
    const [isValid, reason] = checkMessage(text, entities);
    if (!isValid) {
      throw new UserInputError(reason);
    }
    const edited = await this.messageService.editMessage(message.id, text, entities, character);
    await this.eventService.messageEdited(edited);
    return edited;
  }

  @Mutation(() => Message, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async setMessageCrossOff(
    @CurrentUser() user: JwtUser,
    @Args({ name: 'messageId', type: () => ID }) messageId: string,
    @Args({ name: 'crossOff', type: () => Boolean, defaultValue: true }) crossOff: boolean
  ) {
    const message = await this.messageService.findById(messageId);
    if (!message) {
      throw new UserInputError('No message found');
    }
    const member = await this.memberService.findByChannelAndUser(message.channelId, user.id);
    if (message.senderId !== user.id && (!member || !member.isAdmin)) {
      throw new ForbiddenError('No editing authority');
    }
    if (message.deleted) {
      throw new UserInputError('Already deleted');
    }
    if (message.crossOff === crossOff) {
      return null;
    }
    const updated = await this.messageService.messageCrossOff(message.id, crossOff);
    await this.eventService.messageEdited(updated);
    return updated;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteMessage(@CurrentUser() user: JwtUser, @Args({ name: 'messageId', type: () => ID }) messageId: string) {
    const message = await this.messageService.findById(messageId);
    if (!message) {
      throw new UserInputError('No message found');
    }
    const member = await this.memberService.findByChannelAndUser(message.channelId, user.id);
    if (message.senderId !== user.id && (!member || !member.isAdmin)) {
      throw new ForbiddenError('No editing authority');
    }
    if (message.deleted) {
      throw new UserInputError('Already deleted');
    }
    await this.messageService.deleteMessage(message.id);
    await this.eventService.messageDeleted(message.channelId, message.id);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async moveMessage(
    @CurrentUser() user: JwtUser,
    @Args({ name: 'message', type: () => ID }) messageId: string,
    @Args({ name: 'moveAfterOf', type: () => ID, nullable: true }) beforeId?: string,
    @Args({ name: 'moveBeforeOf', type: () => ID, nullable: true }) afterId?: string
  ) {
    const message = await this.messageService.findById(messageId);
    if (!message) {
      throw new UserInputError("Can't found message.");
    }
    if (messageId === beforeId || messageId === afterId) {
      throw new UserInputError("Don't move same message.");
    }
    if (beforeId) {
      const before = await this.messageService.findById(beforeId);
      if (!before) {
        throw new UserInputError("Can't found message.");
      }
      await this.messageService.moveAfterOf(message, before);
    } else if (afterId) {
      const after = await this.messageService.findById(afterId);
      if (!after) {
        throw new UserInputError("Can't found message.");
      }
      await this.messageService.moveBeforeOf(message, after);
    } else {
      throw new UserInputError('Must specify a before message or a after message.');
    }
    return true;
  }
}
