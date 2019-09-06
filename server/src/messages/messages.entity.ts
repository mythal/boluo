import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/users.entity';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { Channel } from '../channels/channels.entity';

@Entity('messages')
@ObjectType()
export class Message {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  @Field(() => User)
  user: Promise<User>;

  @Column({ type: 'uuid', nullable: false })
  @Field(() => ID)
  userId: string;

  @ManyToOne(() => Channel, channel => channel.messages, { nullable: false })
  @JoinColumn({ name: 'channelId' })
  @Field(() => Channel)
  channel: Promise<Channel>;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  channelId: string;

  @Column()
  @Field({ description: 'Name of character. The message is a Out-of-Character message only if this field empty' })
  character: string;

  @Column({ type: 'boolean', default: false })
  @Field()
  isAction: boolean;

  @Column({ type: 'boolean', default: false })
  isRoll: boolean;

  @Column({ type: 'boolean', default: false })
  isGm: boolean;

  @Column({ type: 'text' })
  @Field({ description: 'Message plain text source.' })
  source: string;

  @Column({ type: 'uuid', nullable: true, default: null })
  @Field(() => ID, { nullable: true })
  threadRoot: string | null;

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
