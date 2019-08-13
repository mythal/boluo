import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './users.entity';
import { UserService } from './users.service';
import { ID } from 'type-graphql';

@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @Query(() => [User], { description: 'Get all users.' })
  async users() {
    return await this.userService.findAll();
  }

  @Query(() => User, { nullable: true })
  async getUserById(@Args({ name: 'id', type: () => ID }) id: string) {
    return await this.userService.findById(id);
  }

  @Query(() => User, { nullable: true })
  async getUserByEmail(@Args('email') email: string) {
    return await this.userService.findByEmail(email);
  }

  @Mutation(() => User, { nullable: true })
  async register(@Args('email') email: string, @Args('password') password: string, @Args('nickname') nickname: string) {
    return await this.userService.create(email, nickname, password);
  }
}
