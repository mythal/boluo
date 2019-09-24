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
import { checkName, Entity as MessageEntity, generateId, parse, Result } from 'boluo-common';
import { PreviewMessage } from './PreviewMessage';
import { EventService } from '../events/events.service';
import { MemberService } from '../members/members.service';
import { MediaService } from '../media/media.service';
import { Media } from '../media/media.entity';
import { throwApolloError } from '../error';

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
    const messageResult = await this.messageService.send(
      id,
      text,
      entities,
      channelId,
      name,
      user.id,
      isOOC || false,
      isHidden,
      whisperTo,
      mediaId
    );
    const message = throwApolloError(messageResult);
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
    Result.throwErr(UserInputError, checkName(name));
    let media: Media | undefined;
    if (mediaId) {
      media = throwApolloError(await this.mediaService.getImage(mediaId));
    }

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
    const editResult = await this.messageService.editMessage(messageId, user.id, text, entities, isOOC, name);
    const edited = throwApolloError(editResult);
    await this.eventService.messageEdited(edited);
    return edited;
  }

  @Mutation(() => Message)
  @UseGuards(GqlAuthGuard)
  async setMessageCrossOff(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'messageId', type: () => ID }) messageId: string,
    @Args({ name: 'crossOff', type: () => Boolean, defaultValue: true }) crossOff: boolean
  ) {
    const updated = throwApolloError(await this.messageService.messageCrossOff(user.id, messageId, crossOff));
    await this.eventService.messageEdited(updated);
    return updated;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteMessage(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'messageId', type: () => ID }) messageId: string
  ) {
    const deletedMessage = throwApolloError(await this.messageService.deleteMessage(user.id, messageId));
    await this.eventService.messageDeleted(deletedMessage.channelId, messageId);
    return true;
  }

  @Mutation(() => Message)
  @UseGuards(GqlAuthGuard)
  async moveAfterOf(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'messageId', type: () => ID }) messageId: string,
    @Args({ name: 'target', type: () => ID }) target: string
  ) {
    return throwApolloError(await this.messageService.moveAfterOf(user.id, messageId, target));
  }

  @Mutation(() => Message)
  @UseGuards(GqlAuthGuard)
  async moveBeforeOf(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'messageId', type: () => ID }) messageId: string,
    @Args({ name: 'target', type: () => ID }) target: string
  ) {
    return throwApolloError(await this.messageService.moveBeforeOf(user.id, messageId, target));
  }
}
