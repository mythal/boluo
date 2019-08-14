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
import { Field, ID, ObjectType } from 'type-graphql';
import { Message } from '../messages/messages.entity';
import { User } from '../users/users.entity';

@Entity('channels')
@ObjectType('Channel')
export class Channel {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  title: string;

  @Column({ default: '' })
  @Field({ defaultValue: '' })
  topic: string;

  @CreateDateColumn()
  @Field()
  created: Date;

  @UpdateDateColumn()
  @Field()
  modified: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creatorId' })
  @Field(() => User, { nullable: true })
  creator: Promise<User> | null;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  creatorId: string;

  @OneToMany(() => Message, message => message.channel)
  @Field(() => [Message])
  messages: Promise<Message[]>;
}
