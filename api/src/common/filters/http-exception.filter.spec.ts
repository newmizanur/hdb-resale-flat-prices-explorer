import { ArgumentsHost, BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createMockHost(url = '/api/resale-flats', method = 'GET') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = { method, url };
  const response = { status };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('formats a built-in HttpException subclass (object response from createBody)', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new NotFoundException('Not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not found',
        error: 'Not Found',
        path: '/api/resale-flats',
      }),
    );
    expect(typeof json.mock.calls[0][0].timestamp).toBe('string');
  });

  it('formats a raw HttpException constructed with a plain string response', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new HttpException('teapot', 418), host);

    expect(status).toHaveBeenCalledWith(418);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 418,
        message: 'teapot',
      }),
    );
  });

  it('formats an object-response HttpException (e.g. ValidationPipe failures)', () => {
    const { host, status, json } = createMockHost('/api/resale-flats?sort=bad');
    filter.catch(
      new BadRequestException({ statusCode: 400, message: ['sort must be one of: month:asc, month:desc'], error: 'Bad Request' }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['sort must be one of: month:asc, month:desc'],
        error: 'Bad Request',
        path: '/api/resale-flats?sort=bad',
      }),
    );
  });

  it('maps unknown/unhandled errors to a generic 500 without leaking internal details', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new Error('a database connection string leaked here'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal Server Error',
        error: 'Internal Server Error',
      }),
    );
    const body = json.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain('a database connection string leaked here');
  });
});
