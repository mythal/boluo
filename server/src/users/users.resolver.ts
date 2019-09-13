import { Args, Mutation, Query, ResolveProperty, Resolver, Root } from '@nestjs/graphql';
import { User } from './users.entity';
import { UserService } from './users.service';
import { ID } from 'type-graphql';
import { UseGuards } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators';
import { checkNickname, checkPassword, checkUsername } from 'boluo-common';
import { TokenUserInfo } from '../auth/jwt.strategy';

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
    username = username.trim();
    nickname = nickname.trim();
    const [isUsernameValid, usernameInvalidReason] = checkUsername(username);
    const [isNicknameValid, nicknameInvalidReason] = checkNickname(nickname);
    const [isPasswordValid, passwordInvalidReason] = checkPassword(password);
    const isAllValid = isUsernameValid && isNicknameValid && isPasswordValid;
    if (!isAllValid) {
      throw new UserInputError(usernameInvalidReason || nicknameInvalidReason || passwordInvalidReason);
    }
    const hasUsername = await this.userService.hasUsername(username);
    if (hasUsername) {
      throw new UserInputError('Username is registered');
    }
    return await this.userService.create(username, nickname, password);
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

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  async getMe(@CurrentUser() user: TokenUserInfo) {
    return this.userService.findById(user.id);
  }
}
