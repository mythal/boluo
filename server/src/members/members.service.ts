import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Member } from './members.entity';
import { Repository } from 'typeorm';
import { forbiddenError, inputError, ServiceResult } from '../error';
import { Result } from 'boluo-common';
import { ChannelService } from '../channels/channels.service';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    private readonly channelService: ChannelService
  ) {}

  findByChannelAndUser(channelId: string, userId: string): Promise<Member | undefined> {
    return this.memberRepository.findOne({ where: { channelId, userId } });
  }

  async addUserToChannel(operatorId: string, userId: string, channelId: string): Promise<ServiceResult<Member>> {
    const channel = await this.channelService.findById(channelId);

    if (!channel) {
      return Result.Err(inputError("The channel doesn't exist."));
    }

    const operatorMember = await this.findByChannelAndUser(channelId, operatorId);
    if (!channel.isPublic && !(operatorMember && operatorMember.isAdmin)) {
      this.logger.warn(`Forbidden: A user (${userId}) tried to join a private channel.`);
      return Result.Err(forbiddenError('Cannot join this channel.'));
    }

    const member = this.memberRepository.create({
      userId,
      channelId,
      isAdmin: false,
    });
    await this.memberRepository.save(member);
    return Result.Ok(await this.memberRepository.findOneOrFail({ where: { userId, channelId } }));
  }

  async removeUserFromChannel(userId: string, channelId: string): Promise<ServiceResult<boolean>> {
    const result = await this.memberRepository.delete({ userId, channelId });
    if (result.affected) {
      return Result.Ok(result.affected > 0);
    } else {
      return Result.Ok(false);
    }
  }
}
