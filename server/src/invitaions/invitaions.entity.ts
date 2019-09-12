import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Channel } from '../channels/channels.entity';
import { User } from '../users/users.entity';

@Entity('invitations')
@ObjectType('Invitation')
export class Invitation {
  @PrimaryColumn()
  @Field()
  token!: string;

  @ManyToOne(() => Channel, channel => channel.invitations, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  @Field(() => Channel)
  channel!: Promise<Channel>;

  @Column({ type: 'uuid' })
  @Field(() => ID)
  channelId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  @Field(() => User)
  creator!: Promise<User>;

  @Column({ type: 'uuid' })
  @Field(() => ID)
  creatorId!: string;

  @Column({ type: 'timestamp' })
  @Field()
  expiration!: Date;
}
