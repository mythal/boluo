import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './messages.entity';
import { MemberService } from '../members/members.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,

    private readonly memberService: MemberService
  ) {}

  findAll(): Promise<Message[]> {
    return this.messageRepository.find({ where: { deleted: false } });
  }

  findById(id: string): Promise<Message | undefined> {
    return this.messageRepository.findOne(id, { where: { deleted: false } });
  }

  async create(id: string, source: string, channelId: string, character: string, userId: string, isRoll: boolean) {
    const deleted = false;
    const threadRoot = null;
    const seed = Math.random();
    const member = await this.memberService.findByChannelAndUser(channelId, userId);
    if (!member) {
      throw Error('You are not a member of this channel.');
    }
    await this.messageRepository.insert({
      id,
      source,
      channelId,
      character,
      userId,
      deleted,
      threadRoot,
      isRoll,
      isGm: member.isAdmin,
      seed,
    });
    return this.findById(id);
  }

  async saveMassage(message: Message) {
    return this.messageRepository.save(message);
  }
}
