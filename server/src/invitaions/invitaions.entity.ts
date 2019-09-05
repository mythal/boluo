import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Channel } from '../channels/channels.entity';
import { User } from '../users/users.entity';

@Entity('invitations')
@ObjectType('Invitation')
export class Invitation {
  @ManyToOne(() => Channel, channel => channel.invitations, { nullable: false })
  @JoinColumn({ name: 'channelId' })
  @Field(() => Channel)
  channel: Promise<Channel>;

  @Column({ type: 'uuid' })
  @Field(() => ID)
  channelId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'creatorId' })
  @Field(() => User)
  creator: Promise<User>;

  @Column({ type: 'uuid' })
  @Field(() => ID)
  creatorId: string;

  @Column()
  @Field()
  token: string;

  @Column({ type: 'datetime' })
  @Field()
  expiration: Date;
}
