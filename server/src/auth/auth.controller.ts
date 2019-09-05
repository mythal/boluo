import { Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Controller()
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req) {
    const { id, nickname, username } = req.user;
    const token = this.jwtService.sign({ id, nickname, username });
    return { token };
  }
}
