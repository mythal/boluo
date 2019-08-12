import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './users.entity';
import { UserService } from './users.service';
import { Arg, ID } from 'type-graphql';

@Resolver(of => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @Query(returns => [User], { description: 'Get all users.' })
  async users() {
    return await this.userService.findAll();
  }

  @Query(returns => User, { nullable: true })
  async getUserById(@Arg('id', type => ID) id: string) {
    return await this.userService.findById(id);
  }

  @Mutation(returns => User, { nullable: true })
  async register(@Args('email') email: string, @Args('password') password: string, @Args('nickname') nickname: string) {
    return await this.userService.create(email, nickname, password);
  }
}
