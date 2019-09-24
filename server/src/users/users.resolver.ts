import { Args, Mutation, Query, ResolveProperty, Resolver, Root } from '@nestjs/graphql';
import { User } from './users.entity';
import { UserService } from './users.service';
import { ID } from 'type-graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard, GqlUserGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators';
import { TokenUserInfo } from '../auth/jwt.strategy';
import { throwApolloError } from '../error';

@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @Query(() => User, { nullable: true })
  async getUserById(@Args({ name: 'id', type: () => ID }) id: string) {
    return await this.userService.findById(id);
  }

  @Query(() => User, { nullable: true })
  async getUserByUsername(@Args('username') username: string) {
    return await this.userService.findByUsername(username);
  }

  @Mutation(() => User, { nullable: false })
  async register(
    @Args('username') username: string,
    @Args('password') password: string,
    @Args('nickname') nickname: string
  ) {
    return throwApolloError(await this.userService.create(username, nickname, password));
  }

  @ResolveProperty(() => Boolean)
  async isOnline(@Root() user: User) {
    return await this.userService.isOnline(user.id);
  }

  @Query(() => Boolean, { description: 'Keep alive.', name: 'ping' })
  @UseGuards(GqlAuthGuard)
  async pingQuery(@CurrentUser() user: TokenUserInfo) {
    this.userService.ping(user.id);
    return true;
  }

  @Mutation(() => Boolean, { description: 'Keep alive.', name: 'ping' })
  @UseGuards(GqlAuthGuard)
  async pingMutation(@CurrentUser() user: TokenUserInfo) {
    this.userService.ping(user.id);
    return true;
  }

  @Query(() => User, { nullable: true })
  @UseGuards(GqlUserGuard)
  async getMe(@CurrentUser() user?: TokenUserInfo) {
    if (!user) {
      return null;
    }
    return this.userService.findById(user.id);
  }
}
