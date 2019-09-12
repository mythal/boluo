import { Args, Mutation, Parent, Query, ResolveProperty, Resolver } from '@nestjs/graphql';
import { Channel } from './channels.entity';
import { ChannelService } from './channels.service';
import { ID, Int } from 'type-graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { ForbiddenError, UserInputError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators';
import { TokenUserInfo } from '../auth/jwt.strategy';
import { Message } from '../messages/messages.entity';
import { MemberService } from '../members/members.service';
import { Member } from '../members/members.entity';
import { checkChannelName, checkChannelTitle } from '../common';
import { MessageService } from '../messages/messages.service';
import { EventService } from '../events/events.service';

@Resolver(() => Channel)
export class ChannelResolver {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    private messageService: MessageService,
    private channelService: ChannelService,
    private memberService: MemberService,
    private eventService: EventService
  ) {}

  @ResolveProperty(() => [Message])
  async messages(
    @Parent() channel: Channel,
    @Args({ name: 'limit', type: () => Int, nullable: true }) limit?: number,
    @Args({ name: 'after', type: () => ID, nullable: true }) after?: string
  ) {
    return this.messageService.findByChannel(channel.id, after, limit);
  }

  @Query(() => [Channel], { description: 'Get all channels.' })
  async channels() {
    return await this.channelService.findAll();
  }

  @Query(() => Channel, { nullable: true })
  async getChannelById(@Args({ name: 'id', type: () => ID }) id: string) {
    return await this.channelService.findById(id);
  }

  @Mutation(() => Channel)
  @UseGuards(GqlAuthGuard)
  async createChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'name', type: () => String }) name: string,
    @Args({ name: 'title', type: () => String }) title: string,
    @Args({ name: 'isGame', type: () => Boolean, defaultValue: false }) isGame: boolean,
    @Args({ name: 'isPublic', type: () => Boolean, defaultValue: true }) isPublic: boolean,
    @Args({ name: 'description', type: () => String, defaultValue: '' }) description: string
  ) {
    name = name.trim();
    title = title.trim();
    const [validName, nameInvalidReason] = checkChannelName(name);
    const [validTitle, titleInvalidReason] = checkChannelTitle(title);
    if (!validName || !validTitle) {
      throw new UserInputError(nameInvalidReason || titleInvalidReason);
    }
    if (await this.channelService.hasName(name)) {
      throw new UserInputError('Channel name already exists.');
    }
    const channel = await this.channelService.create(name, title, user.id, isGame, isPublic, description);
    await this.memberService.addUserToChannel(user.id, channel.id, true);
    return channel;
  }

  @Mutation(() => Member, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async joinChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'userId', type: () => ID, nullable: true }) userId?: string
  ) {
    const channel = await this.channelService.findById(channelId);
    if (!channel) {
      throw new UserInputError("The channel doesn't exist.");
    } else if (!channel.isPublic) {
      this.logger.warn(`Forbidden: A user (${user.id}) tried to join a private channel.`);
      throw new ForbiddenError('Cannot join the channel.');
    }
    userId = userId || user.id;
    this.messageService.joinMessage(channelId, userId).then(this.eventService.newMessage);
    return this.memberService.addUserToChannel(userId, channelId);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async quitChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string
  ) {
    this.messageService.leftMessage(channelId, user.id).then(this.eventService.newMessage);
    return this.memberService.removeUserFromChannel(user.id, channelId);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'name', type: () => String }) name: string
  ) {
    const channel = await this.channelService.findById(channelId);
    if (!channel) {
      throw new ForbiddenError('Channel does not exists.');
    } else if (channel.ownerId !== user.id) {
      this.logger.warn(`Forbidden: A user (${user.id}) tried to delete #${channel.name} channel.`);
      throw new ForbiddenError('You have no permission to delete the channel.');
    } else if (channel.name !== name) {
      throw new UserInputError('Channel id and channel name do not match');
    }
    await this.channelService.delete(channel);
    return true;
  }

  @Mutation(() => Channel)
  @UseGuards(GqlAuthGuard)
  async editChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'name', type: () => String, nullable: true }) name?: string,
    @Args({ name: 'title', type: () => String, nullable: true }) title?: string,
    @Args({ name: 'isGame', type: () => Boolean, nullable: true }) isGame?: boolean,
    @Args({ name: 'isPublic', type: () => Boolean, nullable: true }) isPublic?: boolean,
    @Args({ name: 'isArchive', type: () => Boolean, nullable: true }) isArchive?: boolean,
    @Args({ name: 'description', type: () => String, nullable: true }) description?: string
  ) {
    const channel = await this.channelService.findById(channelId);
    if (!channel) {
      throw new ForbiddenError('Channel does not exists.');
    }
    const member = await this.memberService.findByChannelAndUser(channelId, user.id);
    const noPermission = new ForbiddenError('You have no permission.');
    const isOwner = channel.ownerId === user.id;
    const isAdmin = member && member.isAdmin;
    if (!isOwner && !isAdmin) {
      this.logger.warn(`Forbidden: A user (${user.id}) tried to change #${channel.name} channel settings.`);
      throw noPermission;
    }

    const changePublicity = isPublic !== null && isPublic !== channel.isPublic;
    const changeName = name !== undefined;
    const doOwnerOnlyOperate = isArchive || changePublicity || changeName;
    if (!isOwner && doOwnerOnlyOperate) {
      throw noPermission;
    }
    if (name !== undefined) {
      name = name.trim();
      const [valid, reason] = checkChannelName(name);
      if (!valid) {
        throw new UserInputError(reason);
      } else if (await this.channelService.hasName(name)) {
        throw new UserInputError('Channel name already exists.');
      }
    }
    if (title !== undefined) {
      title = title.trim();
      const [valid, reason] = checkChannelTitle(title);
      if (!valid) {
        throw new UserInputError(reason);
      }
    }
    return this.channelService.edit(channelId, name, title, description, isGame, isPublic, isArchive);
  }
}
