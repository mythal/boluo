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
  email: string;

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

  async validate(password: string): Promise<boolean> {
    const hash = this.password;
    return passwordVerify(hash, password);
  }
}
