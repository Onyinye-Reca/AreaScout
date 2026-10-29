import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';
import { ApiErrorResponse, FieldError } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string | number }>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: FieldError[] | undefined;

    if (exception instanceof ZodValidationException) {
      statusCode = exception.getStatus();
      message = 'Validation failed';
      const zodError = exception.getZodError();
      if (zodError instanceof ZodError) {
        errors = zodError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const m = (body as Record<string, unknown>).message;
        message = Array.isArray(m) ? m.join(', ') : ((m as string | undefined) ?? exception.message);
      } else {
        message = exception.message;
      }
    } else if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string })?.code;
      if (code === '23505' || code === 'SQLITE_CONSTRAINT_UNIQUE') {
        statusCode = HttpStatus.CONFLICT;
        message = 'Resource already exists';
      }
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const requestId = request.id ?? request.headers['x-request-id'];
    const body: ApiErrorResponse = {
      status: 'error',
      code: statusCode,
      message,
      ...(errors ? { errors } : {}),
      requestId: requestId != null ? String(requestId) : null,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    response.status(statusCode).json(body);
  }
}
