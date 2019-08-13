import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/users.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<User> {
    console.log(email);
    console.log(password);
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
