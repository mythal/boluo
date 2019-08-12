import { Query, Resolver } from '@nestjs/graphql';
import { Message } from './messages.entity';
import { MessageService } from './messages.service';
import { Arg, ID } from 'type-graphql';
import { UserService } from '../users/users.service';

@Resolver(of => Message)
export class MessageResolver {
  constructor(private messageService: MessageService, private userService: UserService) {}

  @Query(returns => [Message], { description: 'Get all messages.' })
  async messages() {
    return await this.messageService.findAll();
  }

  @Query(returns => Message)
  async getMessageById(@Arg('id', () => ID) id: string) {
    return await this.messageService.findById(id);
  }
}
