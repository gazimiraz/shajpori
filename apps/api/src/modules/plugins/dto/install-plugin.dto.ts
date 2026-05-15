import {
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstallPluginDto {
  @ApiProperty({ description: 'Human-readable plugin name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unique slug identifier e.g. my-plugin' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Semantic version e.g. 1.0.0' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Plugin category e.g. payment, shipping, analytics' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Plugin manifest JSON (entry points, hooks, etc.)' })
  @IsObject()
  manifest: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  author?: string;
}
