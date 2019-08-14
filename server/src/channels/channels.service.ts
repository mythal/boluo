import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from './channels.entity';
import { generateId } from '../utils';

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

  async create(title: string, creatorId: string): Promise<Channel> {
    const id = generateId();
    const channel = await this.channelRepository.create({ id, creatorId, title });
    return await this.channelRepository.save(channel);
  }
}
