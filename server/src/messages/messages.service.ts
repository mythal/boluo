import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './messages.entity';
import { MemberService } from '../members/members.service';
import { Entity } from '../common';
import { generateId } from '../utils';

const crypto = require('crypto');

const RNG_BUFFER_LEN = 128;

@Injectable()
export class MessageService {
  private readonly rngBuffer: Int32Array;
  private rngOffset: number;

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,

    private readonly memberService: MemberService
  ) {
    this.rngBuffer = new Int32Array(RNG_BUFFER_LEN);
    this.fillRngBuffer();
  }

  async editMessage(message: Message, text: string, entities: Entity[]): Promise<Message> {
    message.text = text;
    message.entities = entities;
    message.editDate = new Date();
    return await this.messageRepository.save(message);
  }

  async leftMessage(channelId: string, userId: string) {
    const id = generateId();
    await this.messageRepository.insert({
      id,
      text: '',
      entities: [],
      channelId,
      character: '',
      userId,
      isGm: false,
      seed: this.genRandom(),
      isLeft: true,
    });
    return this.messageRepository.findOneOrFail(id);
  }

  async joinMessage(channelId: string, userId: string) {
    const id = generateId();
    await this.messageRepository.insert({
      id,
      text: '',
      entities: [],
      channelId,
      character: '',
      userId,
      isGm: false,
      seed: this.genRandom(),
      isJoin: true,
    });
    return this.messageRepository.findOneOrFail(id);
  }

  async create(
    id: string,
    text: string,
    entities: Entity[],
    channelId: string,
    character: string,
    userId: string,
    isHidden: boolean = false,
    whisperTo: string[] = []
  ) {
    const seed = this.genRandom();
    const member = await this.memberService.findByChannelAndUser(channelId, userId);
    if (!member) {
      throw Error('You are not a member of this channel.');
    }
    const isGm = member.isAdmin;
    await this.messageRepository.insert({
      id,
      text,
      entities,
      channelId,
      character,
      userId,
      isGm,
      seed,
      isHidden,
      whisperTo,
    });
    return await this.messageRepository.findOneOrFail(id);
  }

  async canRead(message: Message, userId: string | null): Promise<boolean> {
    if (!message.isHidden && message.whisperTo.length === 0) {
      return true;
    }
    if (!userId) {
      return false;
    }
    const member = await this.memberService.findByChannelAndUser(message.channelId, userId);
    if (!member) {
      return false;
    }
    return member.isAdmin;
  }

  findById(id: string): Promise<Message | undefined> {
    return this.messageRepository.findOne(id, { where: { deleted: false } });
  }

  async findByChannel(channelId: string, baseId?: string, limit: number = 128): Promise<Message[]> {
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
      .where('message.channelId = :channelId', { channelId })
      .andWhere('message.deleted = false');
    if (order) {
      const [date, offset] = order;
      query = query.andWhere(
        'message.orderDate < :date OR (message.orderDate = :date AND message.orderOffset < :offset)',
        { date, offset }
      );
    }
    return query.getMany();
  }

  private fillRngBuffer() {
    crypto.randomFillSync(this.rngBuffer);
    this.rngOffset = 0;
  }

  private genRandom(): number {
    if (this.rngOffset >= RNG_BUFFER_LEN) {
      this.fillRngBuffer();
    }
    const rng = this.rngBuffer[this.rngOffset];
    this.rngOffset += 1;
    return rng;
  }

  async saveMassage(message: Message) {
    return this.messageRepository.save(message);
  }
}
