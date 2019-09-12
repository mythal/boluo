import { Controller, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { MediaService } from './media.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { TokenUserInfo } from '../auth/jwt.strategy';
import { MAX_UPLOAD_IMAGE_SIZE } from '../settings';

interface ReceivedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('media'))
  async uploadImage(@Request() req, @UploadedFile() received?: ReceivedFile) {
    if (!received) {
      return { error: 'The server has not received the file.' };
    }
    const { buffer, originalname, size } = received;
    const mimeType = received.mimetype.toLowerCase();
    if (size > MAX_UPLOAD_IMAGE_SIZE) {
      return { error: 'The file is too large.' };
    } else if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'image/gif') {
      return { error: 'You can only upload JPEG, PNG, GIF image files.' };
    }
    const user: TokenUserInfo = req.user;
    const saved = await this.mediaService.saveNewMedia(user.id, originalname, buffer, size, mimeType);
    return { error: null, saved };
  }
}
