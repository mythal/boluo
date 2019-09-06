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

  async hasName(name: string): Promise<boolean> {
    const counter = await this.channelRepository.count({ name });
    return counter > 0;
  }

  async create(
    name: string,
    title: string,
    creatorId: string,
    isGame: boolean = false,
    isPublic: boolean = false,
    description: string = ''
  ): Promise<Channel> {
    const id = generateId();
    name = name.trim();
    description = description.trim();
    const channel = await this.channelRepository.create({ id, creatorId, name, title, isGame, isPublic, description });
    return await this.channelRepository.save(channel);
  }
}
