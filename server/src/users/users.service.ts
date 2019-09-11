import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Repository } from 'typeorm';
import { generateId, passwordHash } from '../utils';
import { onlineKey } from '../redis/key';
import { RedisService } from '../redis/redis.service';
import { KEEP_ALIVE_SEC } from '../settings';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService
  ) {}

  async hasUsername(username: string): Promise<boolean> {
    const counter = await this.userRepository.count({ username });
    return counter > 0;
  }

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
    const id = generateId();
    password = await passwordHash(password);
    await this.userRepository.insert({ id, username, nickname, password });
    this.logger.log(`A user has registered, username: ${username}, nickname: ${nickname}.`);
    return this.userRepository.findOneOrFail(id);
  }
}
