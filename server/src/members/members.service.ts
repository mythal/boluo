import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Member } from './members.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>
  ) {}

  findByChannelAndUser(channelId: string, userId: string): Promise<Member | undefined> {
    return this.memberRepository.findOne({ where: { channelId, userId } });
  }

  async addUserToChannel(userId: string, channelId: string, asAdmin: boolean = false) {
    const member = this.memberRepository.create({
      userId,
      channelId,
      isAdmin: asAdmin,
    });
    await this.memberRepository.save(member);
    return member;
  }
}
