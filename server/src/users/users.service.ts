import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Repository } from 'typeorm';
import { generateId, passwordHash } from '../utils';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  findById(id: string): Promise<User | undefined> {
    return this.userRepository.findOne(id);
  }

  findByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: [{ username }] });
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
