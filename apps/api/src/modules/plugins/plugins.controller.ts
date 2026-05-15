import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { PluginsService } from './plugins.service';
import { InstallPluginDto } from './dto/install-plugin.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateConfigDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  config: Record<string, any>;
}

@ApiTags('Plugins')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('plugins')
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Get()
  @ApiOperation({ summary: 'List all installed plugins' })
  getAll() {
    return this.pluginsService.getAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'List active plugins' })
  getActive() {
    return this.pluginsService.getActive();
  }

  @Post()
  @ApiOperation({ summary: 'Install a new plugin' })
  install(@Body() dto: InstallPluginDto) {
    return this.pluginsService.install(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Uninstall a plugin' })
  @ApiParam({ name: 'id' })
  uninstall(@Param('id') id: string) {
    return this.pluginsService.uninstall(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a plugin' })
  @ApiParam({ name: 'id' })
  activate(@Param('id') id: string) {
    return this.pluginsService.activate(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a plugin' })
  @ApiParam({ name: 'id' })
  deactivate(@Param('id') id: string) {
    return this.pluginsService.deactivate(id);
  }

  @Get(':id/config')
  @ApiOperation({ summary: 'Get plugin configuration' })
  @ApiParam({ name: 'id' })
  getConfig(@Param('id') id: string) {
    return this.pluginsService.getConfig(id);
  }

  @Patch(':id/config')
  @ApiOperation({ summary: 'Update plugin configuration' })
  @ApiParam({ name: 'id' })
  updateConfig(@Param('id') id: string, @Body() dto: UpdateConfigDto) {
    return this.pluginsService.updateConfig(id, dto.config);
  }
}
