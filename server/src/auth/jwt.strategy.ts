import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JWT_SECRET } from '../settings';

export interface JwtPayload {
  id: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    console.log(payload);
    return payload;
  }
}
