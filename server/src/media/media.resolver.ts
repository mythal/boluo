import { Args, Query, Resolver } from '@nestjs/graphql';
import { Media } from './media.entity';
import { MediaService } from './media.service';
import { ID } from 'type-graphql';

@Resolver(() => Media)
export class MediaResolver {
  constructor(private readonly mediaService: MediaService) {}

  @Query(() => Media, { nullable: true })
  getMediaInfo(@Args({ name: 'id', type: () => ID }) id: string) {
    return this.mediaService.getMediaById(id);
  }
}
