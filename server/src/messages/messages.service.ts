import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './messages.entity';
import { MemberService } from '../members/members.service';
import { parse } from '../common/parser';

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

  async create(id: string, source: string, channelId: string, character: string, userId: string, isRoll: boolean) {
    const deleted = false;
    const parent = null;
    const seed = this.genRandom();
    const member = await this.memberService.findByChannelAndUser(channelId, userId);
    if (!member) {
      throw Error('You are not a member of this channel.');
    }
    const isGm = member.isAdmin;
    const { text, entities } = parse(source);
    await this.messageRepository.insert({
      id,
      text,
      entities,
      channelId,
      character,
      userId,
      deleted,
      parent,
      isRoll,
      isGm,
      seed,
    });
    return this.findById(id);
  }

  findAll(): Promise<Message[]> {
    return this.messageRepository.find({ where: { deleted: false } });
  }

  findById(id: string): Promise<Message | undefined> {
    return this.messageRepository.findOne(id, { where: { deleted: false } });
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
