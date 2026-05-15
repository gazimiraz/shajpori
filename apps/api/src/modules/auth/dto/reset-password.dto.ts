import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token received via email' })
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8, description: 'New password (min 8 characters)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100)
  newPassword: string;

  @ApiProperty({ minLength: 8, description: 'Must match newPassword' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  confirmPassword: string;
}
