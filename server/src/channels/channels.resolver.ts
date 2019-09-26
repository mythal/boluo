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
    const create = this.channelService.create(name, user.id, user.nickname, isGame, isPublic, description, parentId);
    return throwApolloError(await create);
  }

  @Mutation(() => Member, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async addChannelMember(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'userId', type: () => ID, nullable: true }) userId?: string
  ) {
    userId = userId || user.id;
    const addMember = this.channelService.addMember(channelId, user.id, user.nickname, userId);
    return throwApolloError(await addMember);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async leaveChannel(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string
  ) {
    const leaveChannel = this.channelService.leave(channelId, user.id, user.nickname);
    return throwApolloError(await leaveChannel);
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
  async setChannelMaster(
    @CurrentUser() user: TokenUserInfo,
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @Args({ name: 'userId', type: () => ID }) userId: string,
    @Args({ name: 'master', type: () => Boolean }) master: boolean
  ) {
    const setMaster = this.channelService.setMaster(channelId, user.id, user.nickname, userId, master);
    return throwApolloError(await setMaster);
  }
}
