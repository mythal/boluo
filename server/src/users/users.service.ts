import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Repository } from 'typeorm';
import { checkName, checkPassword, checkUsername, generateId, Result } from 'boluo-common';
import { passwordHash } from '../utils';
import { onlineKey } from '../redis/key';
import { RedisService } from '../redis/redis.service';
import { KEEP_ALIVE_SEC } from '../settings';
import { inputError, ServiceResult } from '../error';
import { Member } from '../members/members.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>
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

  async create(username: string, nickname: string, password: string): Promise<ServiceResult<User>> {
    username = username.trim();
    nickname = nickname.trim();
    if (await this.hasUsername(username)) {
      return Result.Err(inputError('Username is registered'));
    }
    const usernameCheck = Result.mapErr(checkUsername(username), inputError);
    if (!usernameCheck.ok) {
      return usernameCheck;
    }
    const nicknameCheck = Result.mapErr(checkName(username), inputError);
    if (!nicknameCheck.ok) {
      return nicknameCheck;
    }
    const passwordCheck = Result.mapErr(checkPassword(username), inputError);
    if (!passwordCheck.ok) {
      return passwordCheck;
    }
    const id = generateId();
    password = await passwordHash(password);
    await this.userRepository.insert({ id, username, nickname, password });
    this.logger.log(`A user has registered, username: ${username}, nickname: ${nickname}.`);
    return Result.Ok(await this.userRepository.findOneOrFail(id));
  }

  getChannelMembers(userId: string): Promise<Member[]> {
    return this.memberRepository.find({ where: { userId }, relations: ['channel'] });
  }
}
