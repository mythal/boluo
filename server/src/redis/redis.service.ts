import { Injectable } from '@nestjs/common';
import { RedisClient } from 'redis';
import { REDIS_DB, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from '../settings';

const Redis = require('ioredis');

@Injectable()
export class RedisService {
  public client: RedisClient;

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
      this.client.setex(key, expiration, value);
    } else {
      this.client.set(key, value);
    }
  }

  get(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, reply) => {
        if (err) {
          reject(err);
        } else {
          resolve(reply);
        }
      });
    });
  }
}
