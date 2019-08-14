import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Channel } from './channels.entity';
import { ChannelService } from './channels.service';
import { ID } from 'type-graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators';
import { JwtUser } from '../auth/jwt.strategy';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Resolver(() => Channel)
export class ChannelResolver {
  constructor(
    private channelService: ChannelService,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>
  ) {}

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
  async createChannel(@CurrentUser() user: JwtUser, @Args('title') title: string) {
    title = title.trim();
    if (title.length === 0) {
      throw Error('Empty title');
    }
    return await this.channelService.create(title, user.id);
  }

  @Mutation(() => Channel)
  @UseGuards(GqlAuthGuard)
  async renameChannel(
    @CurrentUser() user: JwtUser,
    @Args({ name: 'id', type: () => ID }) id: string,
    @Args('title') title: string
  ) {
    const channel = await this.channelService.findById(id);
    if (!channel) {
      throw Error("Channel doesn't exist");
    } else if (channel.creatorId !== user.id) {
      throw Error('You are not the creator of this channel');
    }
    channel.title = title.trim();
    return this.channelRepository.save(channel);
  }
}
