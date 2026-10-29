import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { StorageService, type ImageExtension } from '../../common/storage/storage.service';

const MAX_BYTES = 5 * 1024 * 1024;

/** Identify the image by its magic bytes; the client-supplied mimetype and name are not trusted. */
function imageExtension(b: Buffer): ImageExtension | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

@ApiTags('uploads')
@Roles('landlord', 'agent')
@Controller('v1/uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @ResponseMessage('Photo uploaded')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } }))
  async upload(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: Request) {
    if (!file) throw new BadRequestException('Attach a photo');
    const ext = imageExtension(file.buffer);
    if (!ext) throw new BadRequestException('Photos must be JPEG, PNG or WebP');
    return { url: await this.storage.save(file.buffer, ext, `${req.protocol}://${req.get('host')}`) };
  }
}
