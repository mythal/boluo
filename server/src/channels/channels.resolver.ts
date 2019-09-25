import { Args, Mutation, Parent, Query, ResolveProperty, Resolver } from '@nestjs/graphql';
import { Channel } from './channels.entity';
import { ChannelService } from './channels.service';
import { ID, Int } from 'type-graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { GqlAuthGuard, GqlUserGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators';
import { TokenUserInfo } from '../auth/jwt.strategy';
import { Message } from '../messages/messages.entity';
import { MemberService } from '../members/members.service';
import { Member } from '../members/members.entity';
import { MessageService } from '../messages/messages.service';
import { EventService } from '../events/events.service';
import { throwApolloError } from '../error';

@Resolver(() => Channel)
@UseGuards(GqlUserGuard)
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
    @Args({ name: 'after', type: () => ID, nullable: true }) after?: string,
    @CurrentUser() user?: TokenUserInfo
  ) {
    const userId = user ? user.id : undefined;
    return throwApolloError(await this.channelService.getMessages(channel, userId, after, limit));
  }

  @Query(() => [Channel], { description: 'Get all channels.' })
  async channels() {
    return await this.channelService.findAll();
  }

  @Query(() => Channel, { nullable: true })
  async getChannelById(@Args({ name: 'id', type: () => ID }) id: string) {
    return throwApolloError(await this.channelService.findById(id));
  }

  @Mutation(() => Channel)
  @UseGuards(GqlAuthGuard)
  async createChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'name', type: () => String }) name: string,
    @Args({ name: 'isGame', type: () => Boolean, defaultValue: false }) isGame: boolean,
    @Args({ name: 'isPublic', type: () => Boolean, defaultValue: true }) isPublic: boolean,
    @Args({ name: 'description', type: () => String, defaultValue: '' }) description: string,
    @Args({ name: 'parentId', type: () => ID, nullable: true }) parentId?: string
  ) {
    return throwApolloError(await this.channelService.create(name, user.id, isGame, isPublic, description, parentId));
  }

  @Mutation(() => Member, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async joinChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'userId', type: () => ID, nullable: true }) userId?: string
  ) {
    userId = userId || user.id;
    this.messageService.joinMessage(channelId, userId, user.nickname).then(this.eventService.newMessage);
    return throwApolloError(await this.channelService.addUserToChannel(user.id, userId, channelId));
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async quitChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string
  ) {
    this.messageService.leftMessage(channelId, user.id, user.nickname).then(this.eventService.newMessage);
    return throwApolloError(await this.channelService.removeUserFromChannel(user.id, channelId));
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string
  ) {
    await this.channelService.delete(channelId, user.id);
    await this.eventService.channelDeleted(channelId);
    return true;
  }

  @Mutation(() => Member)
  @UseGuards(GqlAuthGuard)
  async setAdmin(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'userId', type: () => ID }) userId: string,
    @Args({ name: 'admin', type: () => Boolean }) admin: boolean
  ) {
    return throwApolloError(await this.channelService.setAdmin(channelId, user.id, userId, admin));
  }
}
