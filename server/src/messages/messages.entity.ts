import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { Channel } from '../channels/channels.entity';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Entity as MessageEntity } from '../common/entities';

@Entity('messages')
@ObjectType()
export class Message {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  @Field(() => User, { nullable: true })
  user: Promise<User> | null;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  userId: string | null;

  @ManyToOne(() => Channel, channel => channel.messages, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  @Field(() => Channel)
  channel: Promise<Channel>;

  @Column({ type: 'uuid' })
  @Field(() => ID)
  channelId: string;

  @Column()
  @Field({ description: 'Name of character. The message is a Out-of-Character message only if this field empty' })
  character: string;

  @Column({ type: 'boolean', default: false })
  @Field()
  isAction: boolean;

  @Column({ type: 'boolean', default: false })
  @Field()
  isGm: boolean;

  @Column({ type: 'boolean', default: false })
  @Field()
  isPinned: boolean;

  @Column({ type: 'text' })
  @Field({ description: 'Message plain text.' })
  text: string;

  @Column({ type: 'jsonb', default: [] })
  @Field(() => GraphQLJSONObject)
  entities: MessageEntity[];

  @OneToMany(() => Message, message => message.parent)
  children: Promise<Message[]>;

  @ManyToOne(() => Message, message => message.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  @Field(() => ID, { nullable: true })
  parent: Promise<Message> | null;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  parentId: string | null;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @Column({ type: 'integer' })
  @Field(() => Int)
  seed: number;

  @CreateDateColumn()
  @Field()
  created: Date;

  @UpdateDateColumn()
  @Field()
  modified: Date;
}
