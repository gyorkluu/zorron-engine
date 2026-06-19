import { Elysia, type ValidationError } from 'elysia';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { AppError, type AppErrorResponse } from '../shared/errors';
import { logger } from '../shared/logger';

/**
 * Extracts or generates a request id from the incoming request headers.
 */
function getRequestId(
  headers: Record<string, string | string[] | undefined> | undefined,
): string {
  const value = headers?.[env.REQUEST_ID_HEADER.toLowerCase()];
  return (Array.isArray(value) ? value[0] : value) ?? randomUUID();
}

/**
 * Maps unknown errors into the standard application error response format.
 *
 * @param error - Caught error value
 * @param requestId - Request trace id
 * @returns Normalized error response payload
 */
export function mapErrorToResponse(
  error: unknown,
  requestId: string,
  code?: string | number,
): { response: AppErrorResponse; status: number } {
  if (error instanceof AppError) {
    return {
      response: {
        code: error.code,
        message: error.message,
        ...(env.NODE_ENV === 'development' ? { details: error.details } : {}),
        requestId,
      },
      status: error.statusCode,
    };
  }

  if (code === 'VALIDATION' || code === 'PARSE') {
    const validationError = error as ValidationError;
    return {
      response: {
        code: 'VALIDATION_001',
        message: 'Validation failed',
        ...(env.NODE_ENV === 'development'
          ? { details: validationError.message }
          : {}),
        requestId,
      },
      status: 400,
    };
  }

  const message =
    error instanceof Error ? error.message : 'Internal server error';

  logger.error({ error, requestId }, 'unhandled error');

  return {
    response: {
      code: 'INTERNAL_001',
      message,
      ...(env.NODE_ENV === 'development' ? { details: error } : {}),
      requestId,
    },
    status: 500,
  };
}

/**
 * [Elysia onError]: global error handler middleware.
 */
export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
  { as: 'global' },
  ({ code, error, set, headers }) => {
    const requestId = getRequestId(headers);
    const { response, status } = mapErrorToResponse(error, requestId, code);

    set.status = status;

    // Log validation errors as warnings
    if (code === 'VALIDATION' || code === 'PARSE') {
      logger.warn({ requestId, error }, 'validation error');
    }

    return response;
  },
);
