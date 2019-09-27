import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel, ChannelType } from './channels.entity';
import {
  checkChannelName,
  EntityUser,
  generateId,
  MemberJoined,
  MemberLeft,
  MessageType,
  NewMaster,
  NewSubChannel,
  Result,
} from 'boluo-common';
import { forbiddenError, inputError, ServiceResult } from '../error';
import { Member } from '../members/members.entity';
import { Message } from '../messages/messages.entity';
import { EventService } from '../events/events.service';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,

    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,

    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,

    private readonly eventService: EventService
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

  memberNumber(channelId: string): Promise<number> {
    return this.memberRepository.count({ where: { channelId } });
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
      if (!userId || !(await this.getRootMember(channel, userId))) {
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

  async getRootMember(channel: Channel, userId: string): Promise<Member | null> {
    let root = channel;
    while (root.parent) {
      root = await root.parent;
    }
    const channelId = root.id;
    const member = await this.memberRepository.findOne({ where: { userId, channelId } });
    return member ? member : null;
  }

  async hasOwnerPermission(channel: Channel, userId: string): Promise<boolean> {
    if (!channel.parent) {
      return channel.ownerId === userId;
    }
    let root = channel;
    while (root.parent) {
      root = await root.parent;
    }
    return root.ownerId === userId;
  }

  async isMaster(channelId: string, userId: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({ where: { userId, channelId } });
    if (!member) {
      return false;
    }
    return member.isMaster;
  }

  async delete(channelId: string, operatorId: string): Promise<ServiceResult<undefined>> {
    const channelResult = await this.findById(channelId);
    if (Result.isErr(channelResult)) {
      return channelResult;
    }
    const channel = channelResult.some;
    if (!(await this.hasOwnerPermission(channel, operatorId))) {
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
    ownerName: string,
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
      if (!member.isMaster) {
        return Result.Err(forbiddenError('Only master can create sub-channel.'));
      }
    }
    const type = isGame ? ChannelType.Game : ChannelType.Discuss;
    await this.channelRepository.insert({ id, ownerId, name, type, isPublic, description, parentId });
    this.logger.log(`A channel #${name} has been created.`);
    await this.memberRepository.insert({ channelId: id, userId: ownerId, isMaster: false });
    if (parentId) {
      this.newSubChannelMessage(parentId, ownerId, ownerName, id, name);
    }
    return Result.Ok(await this.channelRepository.findOneOrFail(id));
  }

  async setMaster(
    channelId: string,
    operatorId: string,
    operatorName: string,
    userId: string,
    isMaster: boolean
  ): Promise<ServiceResult<Member>> {
    const channelResult = await this.findById(channelId);
    if (Result.isErr(channelResult)) {
      return channelResult;
    }
    const channel = channelResult.some;
    if (!(await this.hasOwnerPermission(channel, operatorId))) {
      return Result.Err(forbiddenError("Forbidden: You can't grant a master"));
    }
    const member = await this.memberRepository.findOne({
      where: { channelId, userId },
      relations: ['user'],
    });
    if (!member) {
      return Result.Err(inputError('This user is not joined this channel.'));
    }

    if (isMaster === member.isMaster) {
      return Result.Ok(member);
    }

    const user = await member.user;
    await this.memberRepository.update({ channelId, userId }, { isMaster });
    member.isMaster = isMaster;
    if (isMaster) {
      this.newMasterMessage(channelId, operatorId, operatorName, userId, user.nickname);
    }
    return Result.Ok(member);
  }

  async leave(channelId: string, userId: string, userName: string): Promise<ServiceResult<boolean>> {
    const result = await this.removeUserFromChannel(channelId, userId);
    if (result) {
      this.leftMessage(channelId, userId, userName);
    }
    this.leftMessage(channelId, userId, userName);
    return Result.Ok(result);
  }

  async removeUserFromChannel(channelId: string, userId: string): Promise<boolean> {
    const result = await this.memberRepository.delete({ userId, channelId });
    if (result.affected) {
      return result.affected > 0;
    } else {
      return false;
    }
  }

  async addMember(
    channelId: string,
    operatorId: string,
    operatorName: string,
    userId: string
  ): Promise<ServiceResult<Member>> {
    const channelResult = await this.findById(channelId);

    if (Result.isErr(channelResult)) {
      return channelResult;
    }
    const channel = channelResult.some;

    if (!channel.isPublic && !(await this.hasOwnerPermission(channel, operatorId))) {
      const operator = await this.memberRepository.findOne({ where: { channelId, userId: operatorId } });
      if (!operator || !operator.isMaster) {
        this.logger.warn(`Forbidden: A user (${operatorId}) tried to join a private channel.`);
        return Result.Err(forbiddenError('Cannot join this channel.'));
      }
    }
    await this.memberRepository.insert({
      userId,
      channelId,
      isMaster: false,
    });
    const member = await this.memberRepository.findOneOrFail({
      where: { userId, channelId },
      relations: ['user'],
    });
    const user = await member.user;
    this.joinMessage(channelId, userId, user.nickname, operatorId, operatorName);
    return Result.Ok(member);
  }

  async joinMessage(channelId: string, userId: string, userName: string, operatorId: string, operatorName: string) {
    const id = generateId();
    const user: EntityUser = { id: userId, name: userName };
    const operator: EntityUser = { id: operatorId, name: operatorName };
    const metadata: MemberJoined = { type: 'MemberJoined', user, operator };
    await this.messageRepository.insert({
      id,
      text: `${user.name} joined the channel`,
      entities: [],
      metadata,
      channelId,
      name: operator.name,
      senderId: operator.id,
      isMaster: false,
      seed: 0,
      type: MessageType.System,
    });
    const message = await this.messageRepository.findOneOrFail(id);
    await this.eventService.newMessage(message);
  }

  async leftMessage(channelId: string, userId: string, userName: string) {
    const id = generateId();
    const user: EntityUser = { id: userId, name: userName };
    const metadata: MemberLeft = { type: 'MemberLeft', user };
    await this.messageRepository.insert({
      id,
      text: `${userName} has left`,
      entities: [],
      metadata,
      channelId,
      name: userName,
      senderId: userId,
      isMaster: false,
      seed: 0,
      type: MessageType.System,
    });
    const message = await this.messageRepository.findOneOrFail(id);
    await this.eventService.newMessage(message);
  }

  async newMasterMessage(
    channelId: string,
    operatorId: string,
    operatorName: string,
    userId: string,
    userName: string
  ) {
    const id = generateId();
    const user: EntityUser = { id: userId, name: userName };
    const metadata: NewMaster = { type: 'NewMaster', user };
    await this.messageRepository.insert({
      id,
      text: `${userName} has been set as master`,
      entities: [],
      metadata,
      channelId,
      name: operatorName,
      senderId: operatorId,
      isMaster: false,
      seed: 0,
      type: MessageType.System,
    });
    const message = await this.messageRepository.findOneOrFail(id);
    await this.eventService.newMessage(message);
  }

  async newSubChannelMessage(
    channelId: string,
    operatorId: string,
    operatorName: string,
    subChannelId: string,
    subChannelName: string
  ) {
    const id = generateId();
    const owner: EntityUser = { id: operatorId, name: operatorName };
    const metadata: NewSubChannel = { type: 'NewSubChannel', id: subChannelId, name: subChannelName, owner };
    await this.messageRepository.insert({
      id,
      text: `A sub-channel #${subChannelName} is created`,
      entities: [],
      metadata,
      channelId,
      name: operatorName,
      senderId: operatorId,
      isMaster: false,
      seed: 0,
      type: MessageType.System,
    });
    const message = await this.messageRepository.findOneOrFail(id);
    await this.eventService.newMessage(message);
  }
}
