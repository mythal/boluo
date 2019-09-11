import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from './channels.entity';
import { generateId } from '../utils';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

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

  async delete(channel: Channel): Promise<boolean> {
    await this.channelRepository.delete(channel.id);
    this.logger.log(`The channel #${channel.name} (${channel.title}) has been deleted.`);
    return true;
  }

  async edit(
    channelId: string,
    name?: string,
    title?: string,
    description?: string,
    isGame?: boolean,
    isPublic?: boolean,
    isArchived?: boolean
  ) {
    await this.channelRepository.update(channelId, { name, title, description, isGame, isPublic, isArchived });
    return await this.channelRepository.findOneOrFail(channelId);
  }

  async create(
    name: string,
    title: string,
    ownerId: string,
    isGame: boolean = false,
    isPublic: boolean = false,
    description: string = ''
  ): Promise<Channel> {
    const id = generateId();
    name = name.trim();
    description = description.trim();
    await this.channelRepository.insert({ id, ownerId, name, title, isGame, isPublic, description });
    this.logger.log(`A channel #${name} (${title}) has been created.`);
    return await this.channelRepository.findOneOrFail(id);
  }
}
