import {
  BadRequestException,
  Controller,
  PayloadTooLargeException,
  Post,
  Request,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
      throw new BadRequestException('The server has not received the file.');
    }
    const { buffer, originalname, size } = received;
    const mimeType = received.mimetype.toLowerCase();
    if (size > MAX_UPLOAD_IMAGE_SIZE) {
      throw new PayloadTooLargeException('The file is too large.');
    } else if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'image/gif') {
      throw new UnsupportedMediaTypeException('You can only upload JPEG, PNG, GIF image files.');
    }
    const user: TokenUserInfo = req.user;
    const { id, filename, uploaderId, originalFilename, hash } = await this.mediaService.saveNewMedia(
      user.id,
      originalname,
      buffer,
      size,
      mimeType
    );
    return { id, filename, uploaderId, mimeType, size, originalFilename, hash };
  }
}
