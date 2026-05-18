import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TransformedResponse<T> {
  success: true;
  data: T;
  meta?: unknown;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, TransformedResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<TransformedResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the handler already returned a shaped response, pass it through
        if (data && typeof data === 'object' && 'success' in (data as object)) {
          return data as unknown as TransformedResponse<T>;
        }
        return { success: true as const, data };
      }),
    );
  }
}
