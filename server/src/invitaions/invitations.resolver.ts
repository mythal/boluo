import { Resolver } from '@nestjs/graphql';
import { Invitation } from './invitaions.entity';

@Resolver(() => Invitation)
export class InvitationResolver {}
