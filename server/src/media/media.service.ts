import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Media } from './media.entity';
import { Repository } from 'typeorm';
import { generateId, Result } from 'boluo-common';
import { MEDIA_DIR } from '../settings';
import { inputError, ServiceResult } from '../error';

const fs = require('fs');
const path = require('path');
const hasha = require('hasha');

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>
  ) {}

  getMediaById(id: string): Promise<Media | undefined> {
    return this.mediaRepository.findOne(id);
  }

  async getImage(mediaId: string): Promise<ServiceResult<Media>> {
    const media = await this.getMediaById(mediaId);
    if (!media) {
      return Result.Err(inputError('Can not find the media.'));
    } else if (!media.mimeType.startsWith('image/')) {
      return Result.Err(inputError('At this point, only images are supported.'));
    }
    return Result.Ok(media);
  }

  async saveNewMedia(uploaderId: string, originalFilename: string, buffer: Buffer, size: number, mimeType: string) {
    const id = generateId();
    const ext = path.extname(originalFilename);
    const hash = hasha(buffer, { algorithm: 'md5' });
    const filename = `${hash}${ext}`;
    const writePath = path.join(MEDIA_DIR, filename);
    if (!fs.existsSync(writePath)) {
      fs.writeFile(writePath, buffer, () => {});
    }
    await this.mediaRepository.insert({
      id,
      uploaderId,
      filename,
      originalFilename,
      mimeType,
      size,
      hash,
    });
    this.logger.log(`A file "${originalFilename}" was uploaded. size: ${size} MIME: ${mimeType} hash: ${hash}`);
    return this.mediaRepository.findOneOrFail(id);
  }
}
