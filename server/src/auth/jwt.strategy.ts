import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JWT_ENABLE_EXPIRATION, JWT_SECRET } from '../settings';

export interface TokenUserInfo {
  id: string;
  username: string;
  nickname: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: !JWT_ENABLE_EXPIRATION,
      secretOrKey: JWT_SECRET,
    });
  }

  validate(payload: TokenUserInfo): TokenUserInfo {
    return payload;
  }
}
