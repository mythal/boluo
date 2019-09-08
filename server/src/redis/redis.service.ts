import { Injectable } from '@nestjs/common';
import { REDIS_DB, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from '../settings';
import * as IORedis from 'ioredis';

const Redis = require('ioredis');

@Injectable()
export class RedisService {
  public client: IORedis.Redis;

  constructor() {
    this.client = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      db: REDIS_DB,
    });
  }

  set(key: string, value: string, expiration: number = 0) {
    if (expiration > 0) {
      this.client.setex(key, expiration, value).then();
    } else {
      this.client.set(key, value).then();
    }
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
}
