import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Repository } from 'typeorm';
import { generateId, passwordHash } from '../utils';
import { onlineKey } from '../redis/key';
import { RedisService } from '../redis/redis.service';
import { KEEP_ALIVE_SEC } from '../settings';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService
  ) {}

  findById(id: string): Promise<User | undefined> {
    return this.userRepository.findOne(id);
  }

  findByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: [{ username }] });
  }

  ping(userId: string) {
    const key = onlineKey(userId);
    this.redisService.set(key, String(new Date().getTime()), KEEP_ALIVE_SEC);
  }

  async isOnline(userId: string): Promise<boolean> {
    const key = onlineKey(userId);
    const result = await this.redisService.get(key);
    return Boolean(result);
  }

  async create(username: string, nickname: string, password: string): Promise<User> {
    const user = new User();
    user.id = generateId();
    user.nickname = nickname;
    user.username = username;
    user.password = await passwordHash(password);
    return this.userRepository.save(user);
  }
}
