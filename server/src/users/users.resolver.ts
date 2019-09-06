import { Args, Mutation, Query, ResolveProperty, Resolver, Root } from '@nestjs/graphql';
import { User } from './users.entity';
import { UserService } from './users.service';
import { ID } from 'type-graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators';
import { QueryFailedError } from 'typeorm';
import { checkNickname, checkPassword, checkUsername } from '../common';
import { JwtUser } from '../auth/jwt.strategy';

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
    if (!isNicknameValid) {
      throw Error(nicknameInvalidReason);
    }
    if (!isUsernameValid) {
      throw Error(usernameInvalidReason);
    }
    if (!isPasswordValid) {
      throw Error(passwordInvalidReason);
    }
    try {
      return await this.userService.create(username, nickname, password);
    } catch (e) {
      if (e instanceof QueryFailedError) {
        throw Error('Username is registered');
      }
      throw e;
    }
  }

  @ResolveProperty(() => Boolean)
  async isOnline(@Root() user: User) {
    return await this.userService.isOnline(user.id);
  }

  @Query(() => Boolean, { description: 'Keep alive.' })
  @UseGuards(GqlAuthGuard)
  async ping(@CurrentUser() user: JwtUser) {
    this.userService.ping(user.id);
    return true;
  }

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  async getMe(@CurrentUser() user: JwtUser) {
    return this.userService.findById(user.id);
  }
}
