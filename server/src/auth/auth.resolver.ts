import { Field, ObjectType } from 'type-graphql';
import { User } from '../users/users.entity';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';

@ObjectType()
export class Login {
  @Field()
  token: string;
  @Field()
  user: User;

  constructor(token: string, user: User) {
    this.token = token;
    this.user = user;
  }
}

@Resolver(() => Login)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => Login, { nullable: true })
  async login(
    @Args({ name: 'username', type: () => String }) username: string,
    @Args({ name: 'password', type: () => String }) password: string
  ) {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      return null;
    }
    const token = this.authService.signToken(user);
    return new Login(token, user);
  }
}
