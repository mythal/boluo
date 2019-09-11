import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Media } from './media.entity';
import { Repository } from 'typeorm';
import { generateId } from '../utils';
import { MEDIA_DIR } from '../settings';

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
    this.logger.log(`A file "${originalFilename}" uploaded. size: ${size} MIME: ${mimeType} hash: ${hash}`);
    return { id, filename };
  }
}
