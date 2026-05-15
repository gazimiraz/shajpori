import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RedisService } from '../../redis/redis.service';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  private readonly logger = new Logger(SupportController.name);

  constructor(private readonly redis: RedisService) {}

  @Public()
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a contact form message' })
  async submitContact(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('subject') subject: string,
    @Body('message') message: string,
  ) {
    const entry = JSON.stringify({ name, email, subject, message, createdAt: new Date().toISOString() });
    const client = this.redis.getClient();
    await client.lpush('contact_submissions', entry);
    await client.ltrim('contact_submissions', 0, 999);
    this.logger.log(`Contact from ${email}: ${subject}`);
    return { message: 'Message sent successfully' };
  }
}
