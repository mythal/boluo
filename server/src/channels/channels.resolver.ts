import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Channel } from './channels.entity';
import { ChannelService } from './channels.service';
import { FieldResolver, ID, Root } from 'type-graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators';
import { JwtUser } from '../auth/jwt.strategy';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../messages/messages.entity';
import { MemberService } from '../members/members.service';

@Resolver(() => Channel)
export class ChannelResolver {
  constructor(
    private channelService: ChannelService,
    private memberService: MemberService,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>
  ) {}

  @FieldResolver(() => [Message])
  async messages(@Root() channel: Channel) {
    const messages: Message[] = await channel.messages;
    return messages.filter(m => !m.deleted);
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
    @CurrentUser() user: JwtUser,
    @Args({ name: 'name', type: () => String }) name: string,
    @Args({ name: 'title', type: () => String }) title: string,
    @Args({ name: 'isGame', type: () => Boolean, defaultValue: false }) isGame: boolean,
    @Args({ name: 'isPublic', type: () => Boolean, defaultValue: true }) isPublic: boolean,
    @Args({ name: 'description', type: () => String, defaultValue: '' }) description: string
  ) {
    name = name.trim();
    if (name.length === 0) {
      throw Error('Empty name');
    }
    title = title.trim();
    if (title.length === 0) {
      throw Error('Empty title');
    }
    if (await this.channelService.hasName(name)) {
      throw Error('Channel name already exists.');
    }
    const channel = await this.channelService.create(name, title, user.id, isGame, isPublic, description);
    await this.memberService.addUserToChannel(user.id, channel.id, true);
    return channel;
  }
}
