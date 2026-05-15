import {
  Controller,
  Get,
  Post,
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
import { WebhooksService } from './webhooks.service';
import { Auth } from '../../common/decorators/auth.decorator';
import {
  IsString,
  IsArray,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RegisterWebhookDto {
  @ApiProperty({ description: 'HTTPS URL to receive webhook events' })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'List of event names to subscribe to',
    example: ['order.created', 'payment.completed'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  events: string[];

  @ApiProperty({ description: 'Secret used to sign HMAC-SHA256 signature' })
  @IsString()
  secret: string;
}

class TestWebhookDto {
  @ApiProperty({ description: 'Webhook registration ID to test' })
  @IsString()
  id: string;
}

@ApiTags('Webhooks')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: 'List all webhook registrations' })
  getAll() {
    return this.webhooksService.getAll();
  }

  @Post()
  @ApiOperation({ summary: 'Register a new webhook endpoint' })
  register(@Body() dto: RegisterWebhookDto) {
    return this.webhooksService.register(dto.url, dto.events, dto.secret);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook registration' })
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string) {
    return this.webhooksService.delete(id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test ping to a registered webhook' })
  test(@Body() dto: TestWebhookDto) {
    return this.webhooksService.test(dto.id);
  }
}
