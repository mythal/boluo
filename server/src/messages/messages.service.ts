import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './messages.entity';
import { checkMessage, checkName, Entity, generateId, MessageType, Result } from 'boluo-common';
import { RandomService } from '../random/random.service';
import { forbiddenError, inputError, ServiceResult } from '../error';
import { MediaService } from '../media/media.service';
import { ChannelService } from '../channels/channels.service';
import { Content } from './Content';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly channelService: ChannelService,
    private readonly randomService: RandomService,
    private readonly mediaService: MediaService
  ) {}

  async content(message: Message, userId: string | null): Promise<Content | null> {
    if (message.isPublic()) {
      return message.content();
    } else if (!userId) {
      return null;
    }
    if (message.whisperTo.length > 0) {
      if (message.senderId === userId || message.whisperTo.indexOf(userId) !== -1) {
        return message.content();
      }
    }
    const isMaster = await this.channelService.isMaster(message.channelId, userId);
    return isMaster ? message.content() : null;
  }

  async editMessage(
    messageId: string,
    operatorId: string,
    text: string,
    entities: Entity[],
    isOOC?: boolean,
    name?: string
  ): Promise<ServiceResult<Message>> {
    const message = await this.findById(messageId);
    if (!message) {
      return Result.Err(inputError('No message found'));
    }
    if (message.type !== MessageType.Say && message.type !== MessageType.OOC) {
      return Result.Err(inputError('Incorrect message type'));
    }
    if (message.senderId !== operatorId) {
      return Result.Err(forbiddenError('No editing authority'));
    }
    if (name) {
      name = name.trim();
      const nameResult = Result.mapErr(checkName(name), inputError);
      if (Result.isErr(nameResult)) {
        return nameResult;
      }
    }
    const messageResult = Result.mapErr(checkMessage(text, entities), inputError);
    if (Result.isErr(messageResult)) {
      return messageResult;
    }
    let type = message.type;
    if (isOOC === true) {
      type = MessageType.OOC;
    } else if (isOOC === false) {
      type = MessageType.Say;
    }
    const editDate = new Date();
    await this.messageRepository.update(messageId, { type, text, entities, name, editDate });
    return Result.Ok(await this.messageRepository.findOneOrFail(messageId));
  }

  async leftMessage(channelId: string, senderId: string, name: string): Promise<Message> {
    const id = generateId();
    await this.messageRepository.insert({
      id,
      text: '',
      entities: [],
      channelId,
      name,
      senderId,
      isMaster: false,
      seed: this.randomService.genRandom(),
      type: MessageType.Left,
    });
    return this.messageRepository.findOneOrFail(id);
  }

  async joinMessage(channelId: string, senderId: string, name: string) {
    const id = generateId();
    await this.messageRepository.insert({
      id,
      text: '',
      entities: [],
      channelId,
      name,
      senderId,
      isMaster: false,
      seed: this.randomService.genRandom(),
      type: MessageType.Joined,
    });
    return this.messageRepository.findOneOrFail(id);
  }

  async send(
    id: string,
    text: string,
    entities: Entity[],
    channelId: string,
    name: string,
    senderId: string,
    isOOC: boolean,
    isHidden: boolean,
    whisperTo: string[],
    mediaId?: string
  ): Promise<ServiceResult<Message>> {
    const member = await this.channelService.getMemberById(channelId, senderId);
    if (!member) {
      return Result.Err(forbiddenError('You are not a member of this channel.'));
    }
    name = name.trim();
    const nameCheck = Result.mapErr(checkName(name), inputError);
    if (Result.isErr(nameCheck)) {
      return nameCheck;
    }
    const messageCheck = Result.mapErr(checkMessage(text, entities), inputError);
    if (Result.isErr(messageCheck)) {
      return messageCheck;
    }
    if (mediaId) {
      const mediaResult = await this.mediaService.getImage(mediaId);
      if (Result.isErr(mediaResult)) {
        return mediaResult;
      }
    }
    const type = isOOC ? MessageType.OOC : MessageType.Say;
    const seed = this.randomService.genRandom();
    const isMaster = member.isMaster;
    await this.messageRepository.insert({
      id,
      text,
      entities,
      channelId,
      name,
      senderId,
      isMaster,
      seed,
      isHidden,
      whisperTo,
      type,
      mediaId,
    });
    return Result.Ok(await this.messageRepository.findOneOrFail(id));
  }

  async checkMove(
    operatorId: string,
    messageId: string,
    targetId: string
  ): Promise<ServiceResult<{ message: Message; target: Message }>> {
    if (messageId === targetId) {
      return Result.Err(inputError("Don't move same message."));
    }
    const message = await this.findById(messageId);
    if (!message) {
      return Result.Err(inputError("Can't found message."));
    }
    const target = await this.findById(targetId);
    if (!target) {
      return Result.Err(inputError("Can't found target message."));
    }
    if (message.channelId !== target.channelId) {
      return Result.Err(inputError('Channels are different.'));
    }
    const isMaster = await this.channelService.isMaster(message.channelId, operatorId);
    if (message.senderId !== operatorId && !isMaster) {
      return Result.Err(forbiddenError('No move authority'));
    }
    return Result.Ok({ message, target });
  }

  async moveAfterOf(operatorId: string, messageId: string, targetId: string): Promise<ServiceResult<Message>> {
    const checkResult = await this.checkMove(operatorId, messageId, targetId);
    if (Result.isErr(checkResult)) {
      return checkResult;
    }
    const { message, target } = checkResult.some;
    const channelId = target.channelId;
    const orderDate = target.orderDate;
    const orderOffset = target.orderOffset;
    const update = this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ orderOffset: () => '"orderOffset" + 1' })
      .where('channelId = :channelId', { channelId })
      .andWhere('orderDate = :orderDate AND orderOffset > :orderOffset', { orderDate, orderOffset });
    await update.execute();
    await this.messageRepository.update(message.id, { orderDate, orderOffset: orderOffset + 1 });
    return Result.Ok(await this.messageRepository.findOneOrFail(messageId));
  }

  async moveBeforeOf(operatorId: string, messageId: string, targetId: string): Promise<ServiceResult<Message>> {
    const checkResult = await this.checkMove(operatorId, messageId, targetId);
    if (Result.isErr(checkResult)) {
      return checkResult;
    }
    const { message, target } = checkResult.some;
    const channelId = target.channelId;
    const orderDate = target.orderDate;
    const orderOffset = target.orderOffset;
    const update = this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ orderOffset: () => '"orderOffset" - 1' })
      .where('channelId = :channelId', { channelId })
      .andWhere('orderDate = :orderDate AND orderOffset < :orderOffset', { orderDate, orderOffset });
    await update.execute();
    await this.messageRepository.update(message.id, { orderDate, orderOffset: orderOffset - 1 });
    return Result.Ok(await this.messageRepository.findOneOrFail(messageId));
  }

  findById(id: string): Promise<Message | undefined> {
    return this.messageRepository.findOne(id, { where: { deleted: false } });
  }

  async deleteMessage(operatorId: string, messageId: string): Promise<ServiceResult<Message>> {
    const message = await this.findById(messageId);
    if (!message) {
      return Result.Err(inputError('No message found'));
    }
    const isMaster = await this.channelService.isMaster(message.channelId, operatorId);
    if (message.senderId !== operatorId && !isMaster) {
      return Result.Err(forbiddenError('No delete authority'));
    }
    await this.messageRepository.update(messageId, { deleted: true });
    return Result.Ok(message);
  }

  async messageCrossOff(operatorId: string, messageId: string, crossOff: boolean): Promise<ServiceResult<Message>> {
    const message = await this.findById(messageId);
    if (!message) {
      return Result.Err(inputError('No message found'));
    }
    const isMaster = await this.channelService.isMaster(message.channelId, operatorId);
    if (message.senderId !== operatorId && !isMaster) {
      return Result.Err(forbiddenError('No editing authority'));
    }
    await this.messageRepository.update(messageId, { crossOff });
    return Result.Ok(await this.messageRepository.findOneOrFail(messageId));
  }
}
