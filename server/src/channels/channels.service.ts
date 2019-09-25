import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel, ChannelType } from './channels.entity';
import { checkChannelName, generateId, Result } from 'boluo-common';
import { forbiddenError, inputError, ServiceResult } from '../error';
import { Member } from '../members/members.entity';
import { Message } from '../messages/messages.entity';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,

    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,

    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>
  ) {}

  findAll(): Promise<Channel[]> {
    return this.channelRepository.find({ where: { parentId: null, isPublic: true } });
  }

  async findById(id: string): Promise<ServiceResult<Channel>> {
    const channel = await this.channelRepository.findOne(id);
    if (!channel) {
      return Result.Err(inputError("The channel doesn't exist."));
    }
    return Result.Ok(channel);
  }

  async hasName(name: string, parentId: string | null = null): Promise<boolean> {
    const counter = await this.channelRepository.count({ name, parentId });
    return counter > 0;
  }

  async getMessages(
    channel: Channel,
    userId?: string,
    baseId?: string,
    limit: number = 128
  ): Promise<ServiceResult<Message[]>> {
    if (!channel.isPublic) {
      if (!userId || !(await this.getInheritedMember(channel, userId))) {
        return Result.Err(forbiddenError('This channel is private.'));
      }
    }
    let order: [Date, number] | null = null;
    if (baseId) {
      const base = await this.messageRepository.findOneOrFail(baseId);
      order = [base.orderDate, base.orderOffset];
    }
    let query = this.messageRepository
      .createQueryBuilder('message')
      .limit(limit)
      .orderBy('message.orderDate', 'DESC')
      .addOrderBy('message.orderOffset', 'ASC')
      .where('message.channelId = :channelId', { channelId: channel.id })
      .andWhere('message.deleted = false')
      .leftJoinAndSelect('message.media', 'media');
    if (order) {
      const [date, offset] = order;
      query = query.andWhere(
        'message.orderDate < :date OR (message.orderDate = :date AND message.orderOffset < :offset)',
        { date, offset }
      );
    }
    const messages = await query.getMany();
    return Result.Ok(messages);
  }

  async getMemberById(channelId: string, userId: string): Promise<Member | null> {
    const member = await this.memberRepository.findOne({ where: { channelId, userId } });
    if (!member) {
      return null;
    }
    return member;
  }

  async getInheritedMember(channel: Channel, userId: string): Promise<Member | null> {
    let root = channel;
    while (root.parent) {
      root = await root.parent;
    }
    const channelId = root.id;
    const member = await this.memberRepository.findOne({ where: { userId, channelId } });
    return member ? member : null;
  }

  async isOwner(channel: Channel, userId: string): Promise<boolean> {
    if (!channel.parent) {
      return channel.ownerId === userId;
    }
    let root = channel;
    while (root.parent) {
      root = await root.parent;
    }
    return root.ownerId === userId;
  }

  async isAdmin(channelId: string, userId: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({ where: { userId, channelId } });
    if (!member) {
      return false;
    }
    return member.isAdmin;
  }

  async delete(channelId: string, operatorId: string): Promise<ServiceResult<undefined>> {
    const channelResult = await this.findById(channelId);
    if (Result.isErr(channelResult)) {
      return channelResult;
    }
    const channel = channelResult.some;
    if (!(await this.isOwner(channel, operatorId))) {
      this.logger.warn(`Forbidden: A user (${operatorId}) tried to delete #${channel.name} channel.`);
      return Result.Err(forbiddenError('You have no permission to delete the channel.'));
    }
    await this.channelRepository.delete(channel.id);
    this.logger.log(`The channel #${channel.name} has been deleted.`);
    return Result.Ok(undefined);
  }

  async create(
    name: string,
    ownerId: string,
    isGame: boolean = false,
    isPublic: boolean = false,
    description: string = '',
    parentId: string | null = null
  ): Promise<ServiceResult<Channel>> {
    const id = generateId();
    name = name.trim();
    description = description.trim();
    const channelNameResult = Result.mapErr(checkChannelName(name), inputError);
    if (Result.isErr(channelNameResult)) {
      return channelNameResult;
    }
    if (this.hasName(name, parentId)) {
      return Result.Err(inputError('Channel name already exists.'));
    }
    if (parentId) {
      const parentResult = await this.findById(parentId);
      if (Result.isErr(parentResult)) {
        return parentResult;
      }
      const parent = parentResult.some;
      if (parent.parentId) {
        return Result.Err(inputError('Parent must not a sub-channel.'));
      }
      const member = await this.getMemberById(parentId, ownerId);
      if (!member) {
        return Result.Err(forbiddenError('You are not a member of the parent channel.'));
      }
      if (!member.isAdmin) {
        return Result.Err(forbiddenError('Only admin can create sub-channel.'));
      }
    }
    const type = isGame ? ChannelType.Game : ChannelType.Discuss;
    await this.channelRepository.insert({ id, ownerId, name, type, isPublic, description, parentId });
    this.logger.log(`A channel #${name} has been created.`);
    await this.memberRepository.insert({ channelId: id, userId: ownerId, isAdmin: false });
    return Result.Ok(await this.channelRepository.findOneOrFail(id));
  }

  async setAdmin(
    channelId: string,
    operatorId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<ServiceResult<Member>> {
    const channelResult = await this.findById(channelId);
    if (Result.isErr(channelResult)) {
      return channelResult;
    }
    const channel = channelResult.some;
    const isOwner = await this.isOwner(channel, operatorId);
    if (!isOwner) {
      return Result.Err(forbiddenError("Forbidden: You can't grant an admin"));
    }
    const member = await this.memberRepository.findOne({ where: { channelId, userId } });
    if (!member) {
      return Result.Err(inputError('This user is not joined this channel.'));
    }
    await this.memberRepository.update(member, { isAdmin });
    member.isAdmin = isAdmin;
    return Result.Ok(member);
  }

  async removeUserFromChannel(userId: string, channelId: string): Promise<ServiceResult<boolean>> {
    const result = await this.memberRepository.delete({ userId, channelId });
    if (result.affected) {
      return Result.Ok(result.affected > 0);
    } else {
      return Result.Ok(false);
    }
  }

  async addUserToChannel(operatorId: string, userId: string, channelId: string): Promise<ServiceResult<Member>> {
    const channelResult = await this.findById(channelId);

    if (Result.isErr(channelResult)) {
      return channelResult;
    }
    const channel = channelResult.some;

    const operatorMember = await this.memberRepository.findOne({ where: { channelId, userId: operatorId } });
    if (!channel.isPublic && !(operatorMember && operatorMember.isAdmin)) {
      this.logger.warn(`Forbidden: A user (${userId}) tried to join a private channel.`);
      return Result.Err(forbiddenError('Cannot join this channel.'));
    }

    const member = this.memberRepository.create({
      userId,
      channelId,
      isAdmin: false,
    });
    await this.memberRepository.save(member);
    return Result.Ok(await this.memberRepository.findOneOrFail({ where: { userId, channelId } }));
  }
}
