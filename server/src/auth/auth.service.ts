import { Injectable } from '@nestjs/common';
import { UserService } from '../users/users.service';
import { User } from '../users/users.entity';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);
    if (!user || !user.validate(password)) {
      return null;
    } else {
      return user;
    }
  }
}
