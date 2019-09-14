import { ID } from 'type-graphql';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { CurrentUser } from '../decorators';
import { TokenUserInfo } from '../auth/jwt.strategy';
import { Logger, UseGuards } from '@nestjs/common';
import { ChannelService } from '../channels/channels.service';
import { ForbiddenError, UserInputError } from 'apollo-server-errors';
import { MemberService } from '../members/members.service';
import { ChannelEvent } from './ChannelEvent';
import { EventService } from './events.service';
import { pubSub } from './pubSub';
import { GqlAuthGuard } from '../auth/auth.guard';

@Resolver(() => ChannelEvent)
export class ChannelEventResolver {
  private readonly logger = new Logger(ChannelEventResolver.name);

  constructor(
    private readonly channelService: ChannelService,
    private readonly eventService: EventService,
    private readonly memberService: MemberService
  ) {}

  @Subscription(() => ChannelEvent)
  @UseGuards(GqlAuthGuard)
  async channelEvent(
    @Args({ name: 'channelId', type: () => ID }) channelId: string,
    @CurrentUser() user?: TokenUserInfo
  ) {
    const channel = await this.channelService.findById(channelId);
    if (!channel) {
      throw new UserInputError('Attempt subscribe a channel that does not exist.');
    } else if (!channel.isPublic) {
      if (!user) {
        throw new ForbiddenError('You are not logged in');
      }
      const member = this.memberService.findByChannelAndUser(channelId, user.id);
      if (!member) {
        this.logger.warn(`[Forbidden] A user (${user.id}) attempt to subscribe a channel that they does not joined.`);
        throw new ForbiddenError('You are not a member of this channel.');
      }
    }
    return pubSub.asyncIterator(await this.eventService.getTriggerId(channelId));
  }
}
