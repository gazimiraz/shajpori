import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty({ description: 'Store ID' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ description: 'Opening cash balance', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingCash: number;
}
