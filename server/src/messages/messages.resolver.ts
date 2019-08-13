import { Args, Query, Resolver } from '@nestjs/graphql';
import { Message } from './messages.entity';
import { MessageService } from './messages.service';
import { ID } from 'type-graphql';
import { UserService } from '../users/users.service';

@Resolver(() => Message)
export class MessageResolver {
  constructor(private messageService: MessageService, private userService: UserService) {}

  @Query(() => [Message], { description: 'Get all messages.' })
  async messages() {
    return await this.messageService.findAll();
  }

  @Query(() => Message)
  async getMessageById(@Args({ name: 'id', type: () => ID }) id: string) {
    return await this.messageService.findById(id);
  }
}
