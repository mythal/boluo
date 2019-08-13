import { Args, Query, Resolver } from '@nestjs/graphql';
import { Channel } from './channels.entity';
import { ChannelService } from './channels.service';
import { ID } from 'type-graphql';

@Resolver(() => Channel)
export class ChannelResolver {
  constructor(private channelService: ChannelService) {}

  @Query(() => [Channel], { description: 'Get all channels.' })
  async channels() {
    return await this.channelService.findAll();
  }

  @Query(() => Channel, { nullable: true })
  async getChannelById(@Args({ name: 'id', type: () => ID }) id: string) {
    return await this.channelService.findById(id);
  }
}
