import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from './channels.entity';

@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>
  ) {}

  findAll(): Promise<Channel[]> {
    return this.channelRepository.find();
  }

  findById(id: string): Promise<Channel | undefined> {
    return this.channelRepository.findOne(id);
  }
}
