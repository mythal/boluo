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
import { Invitation } from '../invitaions/invitaions.entity';

@Entity('channels')
@ObjectType('Channel')
export class Channel {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id: string;

  @Column({ type: 'boolean', default: true })
  @Field(() => Boolean, { description: 'Whether this channel is a RPG channel.' })
  isGame: boolean;

  @Column({ type: 'boolean', default: false })
  @Field()
  isPublic: boolean;

  @Column({ type: 'boolean', default: false })
  @Field()
  isDeleted: boolean;

  @Column()
  @Field()
  title: string;

  @Column({ default: '' })
  @Field({ defaultValue: '' })
  topic: string;

  @Column({ default: '' })
  @Field({ defaultValue: '' })
  description: string;

  @CreateDateColumn()
  @Field()
  created: Date;

  @UpdateDateColumn()
  @Field()
  modified: Date;

  @Column({ type: 'boolean', default: false })
  @Field()
  isArchived: boolean;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'creatorId' })
  @Field(() => User, { nullable: false })
  creator: Promise<User> | null;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  creatorId: string;

  @OneToMany(() => Message, message => message.channel)
  @Field(() => [Message])
  messages: Promise<Message[]>;

  @OneToMany(() => Invitation, invitation => invitation.channel)
  @Field(() => [Invitation])
  invitations: Promise<Invitation>;
}
