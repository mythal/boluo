import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { passwordVerify } from '../utils';
import { Media } from '../media/media.entity';

@Entity('users')
@ObjectType('User')
export class User {
  @PrimaryColumn({ type: 'uuid' })
  @Field(() => ID)
  id: string;

  @Index({ unique: true })
  @Column()
  @Field()
  username: string;

  @Column()
  @Field()
  nickname: string;

  @CreateDateColumn()
  @Field()
  created: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  password: string;

  @ManyToOne(() => Media, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avatarMediaId' })
  @Field(() => Media, { nullable: true })
  avatar: Media;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => ID, { nullable: true })
  avatarMediaId: string;

  async validate(password: string): Promise<boolean> {
    const hash = this.password;
    return passwordVerify(hash, password);
  }
}
