import { ResolveProperty, Resolver, Root } from '@nestjs/graphql';
import { Member } from './members.entity';
import { UserService } from '../users/users.service';

@Resolver(() => Member)
export class MemberResolver {
  constructor(private readonly userService: UserService) {}

  @ResolveProperty(() => Boolean)
  async isOnline(@Root() member: Member): Promise<boolean> {
    return await this.userService.isOnline(member.userId);
  }
}
