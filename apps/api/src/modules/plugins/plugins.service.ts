import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InstallPluginDto } from './dto/install-plugin.dto';

@Injectable()
export class PluginsService {
  private readonly logger = new Logger(PluginsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.plugin.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getActive() {
    return this.prisma.plugin.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async install(dto: InstallPluginDto) {
    const existing = await this.prisma.plugin.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Plugin with slug '${dto.slug}' is already installed`,
      );
    }

    const plugin = await this.prisma.plugin.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        version: dto.version,
        category: dto.category,
        manifest: dto.manifest,
        description: dto.description,
        author: dto.author,
        isActive: false,
        config: {},
      },
    });

    this.logger.log(`Plugin installed: ${plugin.name} v${plugin.version}`);
    return plugin;
  }

  async uninstall(id: string) {
    await this.findOrFail(id);
    const plugin = await this.prisma.plugin.delete({ where: { id } });
    this.logger.log(`Plugin uninstalled: ${plugin.name}`);
    return { deleted: true, id };
  }

  async activate(id: string) {
    await this.findOrFail(id);
    const plugin = await this.prisma.plugin.update({
      where: { id },
      data: { isActive: true },
    });
    this.logger.log(`Plugin activated: ${plugin.name}`);
    return plugin;
  }

  async deactivate(id: string) {
    await this.findOrFail(id);
    const plugin = await this.prisma.plugin.update({
      where: { id },
      data: { isActive: false },
    });
    this.logger.log(`Plugin deactivated: ${plugin.name}`);
    return plugin;
  }

  async updateConfig(id: string, config: Record<string, any>) {
    await this.findOrFail(id);
    return this.prisma.plugin.update({
      where: { id },
      data: { config },
    });
  }

  async getConfig(id: string) {
    const plugin = await this.findOrFail(id);
    return { id, slug: plugin.slug, config: plugin.config };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findOrFail(id: string) {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundException(`Plugin ${id} not found`);
    return plugin;
  }
}
