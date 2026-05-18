import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AUDIT_KEY } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const shouldAudit = this.reflector.getAllAndOverride<boolean>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!shouldAudit) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { id?: string } | undefined;

    return next.handle().pipe(
      tap(() => {
        // Audit log creation is handled inside individual service methods
        // that use the AuditLogService directly for before/after state capture.
        // This interceptor is a marker — actual logging is in services.
        void user;
      }),
    );
  }
}
