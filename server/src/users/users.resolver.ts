import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './users.entity';
import { UserService } from './users.service';
import { ID } from 'type-graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators';
import { JwtUser } from '../auth/jwt.strategy';

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

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  async getMe(@CurrentUser() user: JwtUser) {
    return this.userService.findById(user.id);
  }
}
