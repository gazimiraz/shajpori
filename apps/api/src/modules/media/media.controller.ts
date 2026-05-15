import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

function multerStorage(folder: string) {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', folder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${unique}${ext}`);
    },
  });
}

@ApiTags('Media')
@ApiBearerAuth()
@Auth()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage('general'),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'application/pdf',
          'video/mp4',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(`File type ${file.mimetype} not allowed`),
            false,
          );
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a file (image processing via sharp)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'products' },
      },
    },
  })
  @ApiQuery({ name: 'folder', required: false })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = 'general',
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.mediaService.upload(file, folder, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all media files' })
  @ApiQuery({ name: 'folder', required: false })
  getAll(@Query('folder') folder?: string) {
    return this.mediaService.getAll(folder);
  }

  @Get('stats')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Storage statistics (Admin only)' })
  getStorageStats() {
    return this.mediaService.getStorageStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single media file record' })
  @ApiParam({ name: 'id' })
  getOne(@Param('id') id: string) {
    return this.mediaService.getOne(id);
  }

  @Delete(':id')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Delete a media file (Admin only)' })
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
