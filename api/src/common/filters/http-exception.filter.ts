import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, error } = this.resolveExceptionDetails(exception);

    if (statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${request.method} ${request.url} -> ${statusCode}`, stack);
    } else {
      this.logger.debug(`${request.method} ${request.url} -> ${statusCode}: ${JSON.stringify(message)}`);
    }

    const body: ErrorResponseBody = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  private resolveExceptionDetails(exception: unknown): { statusCode: number; message: string | string[]; error: string } {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
        error: 'Internal Server Error',
      };
    }

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return { statusCode, message: exceptionResponse, error: exception.name.replace(/Exception$/, '') };
    }

    const body = exceptionResponse as Record<string, unknown>;
    return {
      statusCode,
      message: (body.message as string | string[]) ?? exception.message,
      error: (body.error as string) ?? HttpStatus[statusCode] ?? 'Error',
    };
  }
}
