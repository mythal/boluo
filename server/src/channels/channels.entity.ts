import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import { Message } from '../messages/messages.entity';
import { User } from '../users/users.entity';
import { Invitation } from '../invitaions/invitaions.entity';
import { Member } from '../members/members.entity';

export enum ChannelType {
  Game = 'Game',
  Discuss = 'Discuss',
}

registerEnumType(ChannelType, { name: 'ChannelType' });

@Entity('channels')
@ObjectType('Channel')
export class Channel {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id!: string;

  @Column({ type: 'enum', enum: ChannelType, default: ChannelType.Discuss })
  @Field(() => ChannelType)
  type!: ChannelType;

  @Column({ type: 'boolean', default: false })
  @Field()
  isPublic!: boolean;

  @Column()
  @Index({ unique: true })
  @Field()
  name!: string;

  @Column()
  @Field()
  title!: string;

  @Column({ default: '' })
  @Field()
  topic!: string;

  @Column({ default: '' })
  @Field()
  description!: string;

  @CreateDateColumn()
  @Field()
  created!: Date;

  @UpdateDateColumn()
  @Field()
  modified!: Date;

  @Column({ type: 'boolean', default: false })
  @Field()
  isArchived!: boolean;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'ownerId' })
  @Field(() => User, { nullable: false })
  owner!: Promise<User>;

  @Column({ type: 'uuid' })
  @Field(() => ID)
  ownerId!: string;

  @OneToMany(() => Message, message => message.channel)
  @Field(() => [Message])
  messages!: Promise<Message[]>;

  @OneToMany(() => Invitation, invitation => invitation.channel)
  @Field(() => [Invitation])
  invitations!: Promise<Invitation[]>;

  @OneToMany(() => Member, member => member.channel)
  @Field(() => [Member])
  members!: Promise<Member[]>;
}
