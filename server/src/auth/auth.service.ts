import { Injectable } from '@nestjs/common';
import { UserService } from '../users/users.service';
import { User } from '../users/users.entity';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

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
}
