import { Args, Mutation, Query, ResolveProperty, Resolver, Root } from '@nestjs/graphql';
import { Message } from './messages.entity';
import { MessageService } from './messages.service';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { CurrentUser } from '../decorators';
import { TokenUserInfo } from '../auth/jwt.strategy';
import { Logger, UseGuards } from '@nestjs/common';
import { GraphQLJSONObject } from 'graphql-type-json';
import { GqlAuthGuard } from '../auth/auth.guard';
import { ForbiddenError, UserInputError } from 'apollo-server-express';
import { checkMessage, checkName, Entity as MessageEntity, generateId, MessageType, parse } from 'boluo-common';
import { PreviewMessage } from './PreviewMessage';
import { EventService } from '../events/events.service';
import { MemberService } from '../members/members.service';
import { MediaService } from '../media/media.service';
import { Media } from '../media/media.entity';

@ObjectType()
class Content {
  @Field()
  text: string;

  @Field(() => GraphQLJSONObject)
  entities: MessageEntity[];

  @Field(() => Int)
  seed: number;

  constructor(text: string, entities: MessageEntity[], seed: number) {
    this.text = text;
    this.entities = entities;
    this.seed = seed;
  }
}

@Resolver(() => Message)
export class MessageResolver {
  private readonly logger = new Logger(MessageResolver.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly eventService: EventService,
    private readonly memberService: MemberService,
    private readonly mediaService: MediaService
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
  async actuallyContent(@Args({ name: 'id', type: () => ID }) id: string, @CurrentUser() user: TokenUserInfo) {
    const message = await this.messageService.findById(id);
    if (!message) {
      throw new UserInputError('No message found');
    }
    const content = new Content(message.text, message.entities, message.seed);
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
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'text', type: () => String }) text: string,
    @Args({ name: 'entities', type: () => [GraphQLJSONObject] }) entities: MessageEntity[],
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'name', type: () => String }) name: string,
    @Args({ name: 'hide', type: () => Boolean, defaultValue: false }) isHidden: boolean,
    @Args({ name: 'whisperTo', type: () => [ID], defaultValue: [] }) whisperTo: string[],
    @Args({ name: 'id', type: () => ID, nullable: true }) id?: string,
    @Args({ name: 'mediaId', type: () => ID, nullable: true }) mediaId?: string,
    @Args({ name: 'isOOC', type: () => Boolean, defaultValue: true }) isOOC?: boolean
  ) {
    if (!id) {
      id = generateId();
    }
    name = name.trim();
    const [isNameValid, nameReason] = checkName(name);
    const [isValid, reason] = checkMessage(text, entities);
    if (!isValid || !isNameValid) {
      throw new UserInputError(reason || nameReason);
    }
    await this.getImage(mediaId);
    const message = await this.messageService.create(
      isOOC ? MessageType.OOC : MessageType.Say,
      id,
      text,
      entities,
      channelId,
      name,
      user.id,
      isHidden,
      whisperTo,
      mediaId
    );
    await this.eventService.newMessage(message);
    return message;
  }

  @Mutation(() => Message, { deprecationReason: "Don't use, just for development." })
  @UseGuards(GqlAuthGuard)
  async sendMessageSource(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'source', type: () => String }) source: string,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'name', type: () => String }) name: string,
    @Args({ name: 'isExpression', type: () => Boolean, defaultValue: true }) isExpression: boolean,
    @Args({ name: 'hide', type: () => Boolean, defaultValue: false }) isHidden: boolean,
    @Args({ name: 'whisperTo', type: () => [ID], defaultValue: [] }) whisperTo: string[],
    @Args({ name: 'id', type: () => ID, nullable: true }) id?: string,
    @Args({ name: 'mediaId', type: () => ID, nullable: true }) mediaId?: string,
    @Args({ name: 'isOOC', type: () => Boolean, defaultValue: true }) isOOC?: boolean
  ) {
    const { text, entities } = parse(source, isExpression);
    return this.sendMessage(user, text, entities, channelId, name, isHidden, whisperTo, id, mediaId, isOOC);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async sendMessagePreview(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'id', type: () => ID }) id: string,
    @Args({ name: 'source', type: () => String, description: 'If blank, just show typing.' })
    source: string,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'name', type: () => String }) name: string,
    @Args({ name: 'startTime', type: () => Date }) startTime: Date,
    @Args({ name: 'isExpression', type: () => Boolean, defaultValue: false }) isExpression: boolean,
    @Args({ name: 'mediaId', type: () => ID, nullable: true }) mediaId?: string
  ) {
    name = name.trim();

    const [isNameValid, nameReason] = checkName(name);
    if (!isNameValid) {
      throw new UserInputError(nameReason);
    }
    const media = await this.getImage(mediaId);
    const message = new PreviewMessage(id, user.id, channelId, name, source, isExpression, startTime, media);
    await this.eventService.messagePreview(message);
    return true;
  }

  @Mutation(() => Message)
  @UseGuards(GqlAuthGuard)
  async editMessage(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'messageId', type: () => String }) messageId: string,
    @Args({ name: 'text', type: () => String }) text: string,
    @Args({ name: 'entities', type: () => [GraphQLJSONObject] }) entities: MessageEntity[],
    @Args({ name: 'name', type: () => String, nullable: true }) name?: string,
    @Args({ name: 'isOOC', type: () => Boolean, nullable: true }) isOOC?: boolean
  ) {
    const message = await this.messageService.findById(messageId);
    if (!message || message.deleted) {
      throw new UserInputError('No message found');
    }
    if (message.type !== MessageType.Say && message.type !== MessageType.OOC) {
      throw new UserInputError('Incorrect message type');
    }
    if (message.senderId !== user.id) {
      throw new ForbiddenError('No editing authority');
    }
    if (name) {
      name = name.trim();
      const [isNameValid, nameReason] = checkName(name);
      if (!isNameValid) {
        throw new UserInputError(nameReason);
      }
    }
    const [isValid, reason] = checkMessage(text, entities);
    if (!isValid) {
      throw new UserInputError(reason);
    }
    const type = isOOC ? MessageType.OOC : message.type;
    const edited = await this.messageService.editMessage(type, message.id, text, entities, name);
    await this.eventService.messageEdited(edited);
    return edited;
  }

  @Mutation(() => Message, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async setMessageCrossOff(
    @CurrentUser() user: TokenUserInfo,
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
  async deleteMessage(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'messageId', type: () => ID }) messageId: string
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
    await this.messageService.deleteMessage(message.id);
    await this.eventService.messageDeleted(message.channelId, message.id);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async moveMessage(
    @CurrentUser() user: TokenUserInfo,
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

  async getImage(mediaId?: string): Promise<Media | undefined> {
    let media: Media | undefined;
    if (mediaId) {
      media = await this.mediaService.getMediaById(mediaId);
      if (!media) {
        throw new UserInputError('Can not find the media.');
      } else if (!media.mimeType.startsWith('image/')) {
        throw new UserInputError('At this point, only images are supported.');
      }
    }
    return media;
  }
}
