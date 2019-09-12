import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { User } from '../users/users.entity';

@Entity('media')
@ObjectType('Media')
export class Media {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaderId' })
  @Field(() => User, { nullable: true })
  uploader!: Promise<User> | null;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  uploaderId!: string | null;

  @Column()
  @Field(() => String)
  filename!: string;

  @Column({ nullable: true })
  @Field(() => String, { nullable: true })
  originalFilename!: string;

  @Column()
  @Field(() => String)
  mimeType!: string;

  @Column()
  @Field(() => String)
  hash!: string;

  @Column({ type: 'integer' })
  @Field(() => Int)
  size!: number;

  @Column({ type: 'text', default: '' })
  @Field()
  description!: string;

  @CreateDateColumn()
  @Field()
  created!: Date;
}
