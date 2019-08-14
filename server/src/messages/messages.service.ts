import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageType } from './messages.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>
  ) {}

  findAll(): Promise<Message[]> {
    return this.messageRepository.find();
  }

  findById(id: string): Promise<Message | undefined> {
    return this.messageRepository.findOne(id);
  }

  async create(id: string, content: string, channelId: string, charName: string, userId: string, type: MessageType) {
    const deleted = false;
    const threadHead = null;
    const entities = [];
    await this.messageRepository.insert({
      id,
      content,
      channelId,
      charName,
      userId,
      deleted,
      threadHead,
      entities,
      type,
    });
    return this.findById(id);
  }

  async saveMassage(message: Message) {
    return this.messageRepository.save(message);
  }
}
