import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/users.entity';
import { Field, ID, Int, ObjectType, registerEnumType } from 'type-graphql';
import { Channel } from '../channels/channels.entity';

export enum MessageType {
  SYSTEM = 'SYSTEM',
  SAY = 'SAY',
  ROLL = 'ROLL',
  OOC = 'OOC',
}

registerEnumType(MessageType, { name: 'MessageType', description: 'A type tag of messages.' });

export enum EntityType {
  ROLL = 'ROLL',
  LINK = 'LINK',
}

registerEnumType(EntityType, { name: 'EntityType', description: 'A type tag of entities.' });

export interface MessageEntity {
  type: EntityType;
  start: number;
  offset: number;
  link?: string;
}

@ObjectType('MessageEntity', { description: 'Text block, range is [start, start+offset).' })
export class MessageEntityDefinition implements MessageEntity {
  @Field(type => EntityType)
  type: EntityType;
  @Field(type => Int)
  start: number;
  @Field(type => Int)
  offset: number;
  @Field({ nullable: true, description: 'Appears only when the type is link' })
  link?: string;
}

@Entity('messages')
@ObjectType()
export class Message {
  @PrimaryColumn({ type: 'uuid' })
  @Field(type => ID)
  id: string;

  @Column({ type: 'enum', enum: MessageType })
  @Field(type => MessageType)
  type: MessageType;

  @ManyToOne(type => User, { nullable: true })
  @JoinColumn()
  @Field(type => User)
  user: Promise<User>;

  @ManyToOne(type => Channel, channel => channel.messages)
  @Field(type => Channel, { nullable: true })
  channel: Promise<Channel>;

  @Column()
  @Field()
  nickname: string;

  @Column()
  @Field()
  charName: string;

  @Column({ type: 'boolean', default: false })
  @Field()
  isAction: boolean;

  @Column({ type: 'text' })
  @Field({ description: 'Message plain text.' })
  content: string;

  @Column({ type: 'jsonb', default: [] })
  @Field(type => [MessageEntityDefinition])
  entities: MessageEntity[];

  @Column({ type: 'uuid', nullable: true, default: null })
  @Field(type => ID, { nullable: true })
  previous: string | null;

  @Column({ type: 'boolean', default: false })
  @Field()
  inThread: boolean;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn()
  @Field()
  created: Date;

  @UpdateDateColumn()
  @Field()
  modified: Date;

  @Field({ description: 'Is a cached message.', defaultValue: false })
  cached: boolean = false;
}
