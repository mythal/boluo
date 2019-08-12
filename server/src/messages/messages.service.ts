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
    return this.messageRepository.find();
  }

  findById(id: string): Promise<Message | undefined> {
    return this.messageRepository.findOne(id);
  }
}
