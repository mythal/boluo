import { Query, Resolver } from '@nestjs/graphql';
import { Channel } from './channels.entity';
import { ChannelService } from './channels.service';
import { Arg, ID } from 'type-graphql';

@Resolver(of => Channel)
export class ChannelResolver {
  constructor(private channelService: ChannelService) {}

  @Query(returns => [Channel], { description: 'Get all channels.' })
  async channels() {
    return await this.channelService.findAll();
  }

  @Query(returns => Channel, { nullable: true })
  async getChannelById(@Arg('id', type => ID) id: string) {
    return await this.channelService.findById(id);
  }
}
