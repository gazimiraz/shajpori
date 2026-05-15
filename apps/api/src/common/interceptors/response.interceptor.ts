import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // If the response already carries a `success` field, pass through unchanged
        if (data !== null && typeof data === 'object' && 'success' in data) {
          return data as T;
        }
        return {
          success: true,
          data,
        } as ApiResponse<T>;
      }),
    );
  }
}
