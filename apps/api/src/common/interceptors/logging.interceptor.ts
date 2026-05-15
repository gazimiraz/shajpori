import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req as { method: string; url: string };
    const now = Date.now();

    this.logger.log(`--> ${method} ${url}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode: number = res.statusCode;
          const elapsed = Date.now() - now;
          this.logger.log(`[${method}] ${url} - ${statusCode} (${elapsed}ms)`);
        },
        error: (err: Error) => {
          const elapsed = Date.now() - now;
          const statusCode = (err as any)?.status ?? 500;
          this.logger.error(`[${method}] ${url} - ${statusCode} (${elapsed}ms) ${err.message}`);
        },
      }),
    );
  }
}
