import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './messages.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>
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
    await this.messageRepository.insert({
      id,
      source,
      channelId,
      character,
      userId,
      deleted,
      threadRoot,
      isRoll,
      seed,
    });
    return this.findById(id);
  }

  async saveMassage(message: Message) {
    return this.messageRepository.save(message);
  }
}
