import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadsRoot: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadsRoot = path.join(process.cwd(), 'uploads');
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async upload(
    file: Express.Multer.File,
    folder: string,
    uploadedBy: string,
  ) {
    const isImage = file.mimetype.startsWith('image/');
    let finalFilename = file.filename;
    let finalSize = file.size;
    let width: number | undefined;
    let height: number | undefined;

    if (isImage) {
      try {
        const sharp = require('sharp');
        const ext = '.webp';
        const baseName = path.parse(file.filename).name;
        const webpFilename = `${baseName}${ext}`;
        const destDir = path.join(this.uploadsRoot, folder);
        const webpPath = path.join(destDir, webpFilename);

        const metadata = await sharp(file.path)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(webpPath);

        // Remove original if converted to webp
        if (file.path !== webpPath) {
          try {
            fs.unlinkSync(file.path);
          } catch {
            // ignore
          }
        }

        finalFilename = webpFilename;
        finalSize = metadata.size;
        width = metadata.width;
        height = metadata.height;
      } catch (err) {
        this.logger.warn(
          `sharp processing failed (using original): ${err.message}`,
        );
      }
    }

    const url = `/uploads/${folder}/${finalFilename}`;

    return this.prisma.mediaFile.create({
      data: {
        name: finalFilename,
        originalName: file.originalname,
        url,
        mimeType: isImage ? 'image/webp' : file.mimetype,
        size: finalSize,
        width,
        height,
        folder,
        uploadedBy,
      },
    });
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  async getAll(folder?: string) {
    return this.prisma.mediaFile.findMany({
      where: folder ? { folder } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Single ───────────────────────────────────────────────────────────────

  async getOne(id: string) {
    const file = await this.prisma.mediaFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(`MediaFile ${id} not found`);
    return file;
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(id: string) {
    const file = await this.getOne(id);

    // Attempt to remove from filesystem
    try {
      const filePath = path.join(process.cwd(), file.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      this.logger.warn(`Could not delete file from disk: ${err.message}`);
    }

    return this.prisma.mediaFile.delete({ where: { id } });
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStorageStats() {
    const files = await this.prisma.mediaFile.findMany({
      select: { folder: true, size: true },
    });

    const totalFiles = files.length;
    const totalSize = files.reduce((s, f) => s + f.size, 0);

    const byFolderMap = files.reduce(
      (acc, f) => {
        const key = f.folder;
        if (!acc[key]) acc[key] = { folder: key, count: 0, size: 0 };
        acc[key].count++;
        acc[key].size += f.size;
        return acc;
      },
      {} as Record<string, { folder: string; count: number; size: number }>,
    );

    return {
      totalFiles,
      totalSize,
      totalSizeMB: +(totalSize / 1024 / 1024).toFixed(2),
      byFolder: Object.values(byFolderMap),
    };
  }
}
