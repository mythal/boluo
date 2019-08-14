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
  @Field(() => EntityType)
  type: EntityType;
  @Field(() => Int)
  start: number;
  @Field(() => Int)
  offset: number;
  @Field({ nullable: true, description: 'Appears only when the type is link' })
  link?: string;
}

@Entity('messages')
@ObjectType()
export class Message {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id: string;

  @Column({ type: 'enum', enum: MessageType })
  @Field(() => MessageType)
  type: MessageType;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  @Field(() => User, { nullable: true })
  user: Promise<User>;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  userId: string;

  @ManyToOne(() => Channel, channel => channel.messages)
  @JoinColumn({ name: 'channelId' })
  @Field(() => Channel, { nullable: true })
  channel: Promise<Channel>;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  channelId: string;

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
  @Field(() => [MessageEntityDefinition])
  entities: MessageEntity[];

  @Column({ type: 'uuid', nullable: true, default: null })
  @Field(() => ID, { nullable: true })
  previous: string | null;

  @Column({ type: 'uuid', nullable: true, default: null })
  @Field(() => ID, { nullable: true })
  threadHead: string | null;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn()
  @Field()
  created: Date;

  @UpdateDateColumn()
  @Field()
  modified: Date;
}
