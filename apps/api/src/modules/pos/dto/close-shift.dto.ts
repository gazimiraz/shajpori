import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({ description: 'Actual cash in drawer at close', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  closingCash: number;

  @ApiPropertyOptional({ description: 'Closing notes or handover comments' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
