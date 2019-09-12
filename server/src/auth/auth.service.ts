import { Injectable } from '@nestjs/common';
import { UserService } from '../users/users.service';
import { User } from '../users/users.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService, private readonly jwtService: JwtService) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userService.findByUsername(username);
    if (!user) {
      return null;
    }
    const isValid = await user.validate(password);
    if (!isValid) {
      return null;
    }
    return user;
  }

  signToken({ id, nickname, username }: User) {
    return this.jwtService.sign({ id, nickname, username });
  }
}
