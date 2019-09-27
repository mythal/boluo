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
import { Field, ID, Int, ObjectType, registerEnumType } from 'type-graphql';
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
@Index(['name', 'parentId'], { unique: true })
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

  @ManyToOne(() => Channel, channel => channel.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  @Field(() => Channel, { nullable: true })
  parent!: Promise<Channel> | null;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  parentId!: string | null;

  @OneToMany(() => Channel, channel => channel.parent)
  @Field(() => [Channel])
  children!: Promise<Channel[]>;

  @Column()
  @Field()
  name!: string;

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

  @Column({ type: 'integer', default: 20 })
  @Field(() => Int)
  diceDefaultFace!: number;

  @Column({ type: 'text', default: '' })
  @Field(() => String, { description: 'ISO 639-1, An empty string represents the language of the channel is not set' })
  language!: string;
}
