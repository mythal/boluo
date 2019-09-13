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
import { Field, ID, Int, ObjectType, registerEnumType } from 'type-graphql';
import { Channel } from '../channels/channels.entity';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Entity as MessageEntity } from 'boluo-common';
import { Media } from '../media/media.entity';

export enum MessageType {
  Say = 'Say',
  OOC = 'OOC',
  Joined = 'Join',
  Left = 'Left',
}

registerEnumType(MessageType, { name: 'MessageType' });

@Entity('messages')
@ObjectType()
export class Message {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id!: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.OOC })
  @Field(() => MessageType)
  type!: MessageType;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  @Field(() => User, { nullable: true })
  sender!: Promise<User> | null;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  senderId!: string | null;

  @ManyToOne(() => Channel, channel => channel.messages, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  @Field(() => Channel)
  channel!: Promise<Channel>;

  @Column({ type: 'uuid' })
  @Field(() => ID)
  channelId!: string;

  @Column()
  @Field({ description: 'Name of character. The message is a Out-of-Character message only if this field empty' })
  character!: string;

  @Column({ type: 'boolean', default: false })
  @Field({ description: 'Whether this message represents an action.' })
  isAction!: boolean;

  @Column({ type: 'boolean', default: false })
  @Field(() => Boolean, { description: 'Empty massage mark the member has joined.' })
  @Field()
  isJoin!: boolean;

  @Column({ type: 'boolean', default: false })
  @Field(() => Boolean, { description: 'Empty massage mark the member has left.' })
  isLeave!: boolean;

  @Column({ type: 'boolean', default: false })
  @Field()
  isGm!: boolean;

  @Column({ type: 'boolean', default: false })
  @Field()
  isPinned!: boolean;

  @Column({ type: 'boolean', default: false })
  @Field()
  isHidden!: boolean;

  @Column({ type: 'uuid', array: true, default: '{}' })
  @Field(() => [ID], { description: 'If the list is not empty, it represents this is a whisper message.' })
  whisperTo!: string[];

  @Column({ type: 'text' })
  @Field({ description: 'Message plain text. If this message is not public, the string is always empty.' })
  text!: string;

  @Column({ type: 'jsonb', default: [] })
  @Field(() => GraphQLJSONObject, {
    description: 'Message rich text entities. If this message is not public, the list is always empty',
  })
  entities!: MessageEntity[];

  @ManyToOne(() => Media, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mediaId' })
  @Field(() => Media, { nullable: true })
  media!: Media;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  mediaId!: string;

  @OneToMany(() => Message, message => message.parent)
  children!: Promise<Message[]>;

  @ManyToOne(() => Message, message => message.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  @Field(() => ID, { nullable: true })
  parent!: Promise<Message> | null;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  parentId!: string | null;

  @Column({ type: 'boolean', default: false })
  @Field()
  crossOff!: boolean;

  @Column({ type: 'boolean', default: false })
  deleted!: boolean;

  @Column({ type: 'integer', default: 0 })
  @Field(() => Int, { description: 'Random seed. If this message is not public, the seed is always 0.' })
  seed!: number;

  @CreateDateColumn()
  @Field()
  created!: Date;

  @CreateDateColumn()
  @Field()
  orderDate!: Date;

  @Column({ type: 'integer', default: 0 })
  @Field(() => Int)
  orderOffset!: number;

  @UpdateDateColumn()
  @Field()
  modified!: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Field(() => Date, { nullable: true })
  editDate!: Date | null;

  isPublic() {
    return !this.isHidden && this.whisperTo.length === 0;
  }
}
