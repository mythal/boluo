import { Field, Int, ObjectType } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Entity as MessageEntity } from 'boluo-common';

@ObjectType()
export class Content {
  @Field({ description: 'Message plain text.' })
  text: string;

  @Field(() => [GraphQLJSONObject], { description: 'Message rich text entities.' })
  entities: MessageEntity[];

  @Field(() => Int, { description: 'Random seed.' })
  seed: number;

  constructor(text: string, entities: MessageEntity[], seed: number) {
    this.text = text;
    this.entities = entities;
    this.seed = seed;
  }
}
