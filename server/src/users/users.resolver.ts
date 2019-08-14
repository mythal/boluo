import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './users.entity';
import { UserService } from './users.service';
import { ID } from 'type-graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../decorators';
import { QueryFailedError } from 'typeorm';

function checkEmailFormat(email: string): boolean {
  // tslint:disable-next-line:max-line-length
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

function checkNickname(nickname: string): [boolean, string] {
  const NICKNAME_MAX_CHARACTERS = 24;
  if (nickname.length > NICKNAME_MAX_CHARACTERS) {
    return [false, `Nickname must be less than ${NICKNAME_MAX_CHARACTERS} characters.`];
  }
  return [true, ''];
}

function checkPassword(password: string): [boolean, string] {
  const MIN_PASSWORD_LENGTH = 8;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return [false, `Password must have at least ${MIN_PASSWORD_LENGTH} characters`];
  }
  return [true, ''];
}

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

  @Mutation(() => User, { nullable: false })
  async register(@Args('email') email: string, @Args('password') password: string, @Args('nickname') nickname: string) {
    nickname = nickname.trim();
    if (!checkEmailFormat(email)) {
      throw Error('Invalid Email address');
    }
    const [isNicknameValid, nicknameInvalidReason] = checkNickname(nickname);
    if (!isNicknameValid) {
      throw Error(nicknameInvalidReason);
    }
    const [isPasswordValid, passwordInvalidReason] = checkPassword(password);
    if (!isPasswordValid) {
      throw Error(passwordInvalidReason);
    }
    try {
      return await this.userService.create(email, nickname, password);
    } catch (e) {
      if (e instanceof QueryFailedError) {
        throw Error('Email is registered');
      }
      throw e;
    }
  }

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  async getMe(@CurrentUser() user) {
    return this.userService.findById(user.id);
  }
}
