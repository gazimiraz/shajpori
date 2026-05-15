import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SetSettingDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  value: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

class BulkSettingsDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  settings: Record<string, any>;
}

class UpdateStoreInfoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Auth('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all settings (Admin)' })
  @ApiQuery({ name: 'group', required: false })
  getAll(@Query('group') group?: string) {
    return this.settingsService.getAll(group);
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get all public settings (no auth required)' })
  getPublic() {
    return this.settingsService.getPublic();
  }

  @Get('store')
  @Public()
  @ApiOperation({ summary: 'Get store information (public)' })
  getStoreInfo() {
    return this.settingsService.getStoreInfo();
  }

  @Patch()
  @Auth('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set/update a single setting (Admin)' })
  set(@Body() dto: SetSettingDto) {
    return this.settingsService.set(
      dto.key,
      dto.value,
      dto.group ?? 'general',
      dto.isPublic ?? false,
    );
  }

  @Patch('store')
  @Auth('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store information (Admin)' })
  updateStoreInfo(@Body() dto: UpdateStoreInfoDto) {
    return this.settingsService.updateStoreInfo(dto);
  }

  @Post('bulk')
  @Auth('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set multiple settings at once (Admin)' })
  setBulk(@Body() dto: BulkSettingsDto) {
    return this.settingsService.setBulk(dto.settings);
  }
}
