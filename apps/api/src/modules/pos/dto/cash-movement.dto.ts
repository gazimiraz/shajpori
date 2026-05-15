import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CashMovementType {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
  PETTY_CASH = 'PETTY_CASH',
  EXPENSE = 'EXPENSE',
}

export class AddCashMovementDto {
  @ApiProperty({ enum: CashMovementType, description: 'Type of cash movement' })
  @IsEnum(CashMovementType)
  type: CashMovementType;

  @ApiProperty({ description: 'Amount', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Reason for this cash movement' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
