import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JWT_EXPIRATION, JWT_SECRET } from '../settings';

export interface JwtUser {
  id: string;
  username: string;
  nickname: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: JWT_EXPIRATION,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtUser): Promise<JwtUser> {
    return payload;
  }
}
