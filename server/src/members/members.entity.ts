import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { User } from '../users/users.entity';
import { Channel } from '../channels/channels.entity';

@Entity('members')
@ObjectType('Members')
export class Member {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  @Field(() => User)
  user!: Promise<User>;

  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  userId!: string;

  @ManyToOne(() => Channel, channel => channel.members, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  @Field(() => Channel)
  channel!: Promise<Channel>;

  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  channelId!: string;

  @Column({ type: 'boolean', default: false })
  @Field()
  isAdmin!: boolean;

  @CreateDateColumn()
  @Field()
  joinDate!: Date;

  @Column({ default: '' })
  @Field()
  character!: string;
}
