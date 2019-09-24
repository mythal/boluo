import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel, ChannelType } from './channels.entity';
import { checkChannelName, checkChannelTitle, generateId, Result } from 'boluo-common';
import { forbiddenError, inputError, ServiceResult } from '../error';
import { Member } from '../members/members.entity';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,

    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>
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

  async delete(channelId: string, operatorId: string): Promise<ServiceResult<undefined>> {
    const channel = await this.findById(channelId);
    if (!channel) {
      return Result.Err(inputError('Channel does not exists.'));
    }
    if (channel.ownerId !== operatorId) {
      this.logger.warn(`Forbidden: A user (${operatorId}) tried to delete #${channel.name} channel.`);
      return Result.Err(forbiddenError('You have no permission to delete the channel.'));
    }
    await this.channelRepository.delete(channel.id);
    this.logger.log(`The channel #${channel.name} (${channel.title}) has been deleted.`);
    return Result.Ok(undefined);
  }

  async create(
    name: string,
    title: string,
    ownerId: string,
    isGame: boolean = false,
    isPublic: boolean = false,
    description: string = ''
  ): Promise<ServiceResult<Channel>> {
    const id = generateId();
    name = name.trim();
    title = title.trim();
    description = description.trim();
    const channelNameResult = Result.mapErr(checkChannelName(name), inputError);
    if (!channelNameResult.ok) {
      return channelNameResult;
    }
    const channelTitleResult = Result.mapErr(checkChannelTitle(title), inputError);
    if (!channelTitleResult.ok) {
      return channelTitleResult;
    }
    if (this.hasName(name)) {
      return Result.Err(inputError('Channel name already exists.'));
    }
    const type = isGame ? ChannelType.Game : ChannelType.Discuss;
    await this.channelRepository.insert({ id, ownerId, name, title, type, isPublic, description });
    this.logger.log(`A channel #${name} (${title}) has been created.`);
    await this.memberRepository.insert({ channelId: id, userId: ownerId, isAdmin: true });
    return Result.Ok(await this.channelRepository.findOneOrFail(id));
  }
}
