import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Message } from '../messages/messages.entity';

@Entity('channels')
@ObjectType('Channel')
export class Channel {
  @PrimaryColumn({ type: 'uuid' })
  @Field(type => ID)
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

  @OneToMany(type => Message, message => message.channel)
  @Field(type => [Message])
  messages: Promise<Message[]>;
}
