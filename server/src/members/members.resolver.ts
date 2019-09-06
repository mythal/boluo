import { Resolver } from '@nestjs/graphql';
import { Member } from './members.entity';

@Resolver(() => Member)
export class MemberResolver {}
