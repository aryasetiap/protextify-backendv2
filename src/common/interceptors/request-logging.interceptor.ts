import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.isEnabled()) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const startedAt = Date.now();
    const method = request.method;
    const path = this.safePath(request.originalUrl || request.url || '');

    return next.handle().pipe(
      tap(() => {
        this.logRequest({
          method,
          path,
          statusCode: response.statusCode,
          responseTimeMs: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
        });
      }),
      catchError((error) => {
        this.logRequest({
          method,
          path,
          statusCode: error?.status || response.statusCode || 500,
          responseTimeMs: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
        });
        return throwError(() => error);
      }),
    );
  }

  private isEnabled(): boolean {
    const value = process.env.ENABLE_REQUEST_LOGGING || '';
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }

  private safePath(path: string): string {
    return path.split('?')[0] || '/';
  }

  private logRequest(entry: {
    method: string;
    path: string;
    statusCode: number;
    responseTimeMs: number;
    timestamp: string;
  }) {
    this.logger.log(JSON.stringify(entry));
  }
}
