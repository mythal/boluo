import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { User } from '../users/users.entity';
import { Channel } from '../channels/channels.entity';

@Entity('members')
@ObjectType('Members')
export class Member {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  @Field(() => User)
  user: Promise<User>;

  @Column({ type: 'uuid' })
  @Field()
  userId: string;

  @ManyToOne(() => Channel, channel => channel.members, { nullable: false })
  @JoinColumn({ name: 'channelId' })
  @Field(() => Channel)
  channel: Promise<Channel>;

  @Column({ type: 'uuid' })
  @Field()
  channelId: string;

  @Column({ type: 'boolean', default: false })
  @Field()
  isAdmin: boolean;

  @CreateDateColumn()
  @Field()
  joinDate: Date;

  @Column({ type: 'boolean', default: false })
  @Field()
  isMuted: boolean;

  @Column({ default: '' })
  @Field()
  character: string;
}
