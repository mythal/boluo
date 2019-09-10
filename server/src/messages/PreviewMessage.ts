import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class PreviewMessage {
  @Field(() => ID)
  id: string;

  @Field(() => Boolean)
  isExpression: boolean;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  channelId: string;

  @Field()
  character: string;

  @Field()
  source: string;

  @Field({ nullable: false })
  startTime: Date;

  @Field({ nullable: false })
  updateTime: Date;
}
