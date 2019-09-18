import { Field, ID, ObjectType } from 'type-graphql';
import { Media } from '../media/media.entity';

const PREVIEW_SOURCE_MAX_LENGTH = 1024;

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

  @Field(() => Media, { nullable: true })
  media?: Media;

  constructor(
    id: string,
    userId: string,
    channelId: string,
    character: string,
    source: string,
    isExpression: boolean,
    startTime: Date,
    media?: Media
  ) {
    this.id = id;
    this.userId = userId;
    this.channelId = channelId;
    this.character = character;
    this.source = source.length < PREVIEW_SOURCE_MAX_LENGTH ? source : '';
    this.isExpression = isExpression;
    this.startTime = startTime;
    this.updateTime = new Date();
    this.media = media;
  }
}
