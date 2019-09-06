import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { passwordVerify } from '../utils';

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

  @Column({ default: '' })
  @Field()
  avatar: string;

  @CreateDateColumn()
  @Field()
  created: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  password: string;

  async validate(password: string): Promise<boolean> {
    const hash = this.password;
    return passwordVerify(hash, password);
  }
}
