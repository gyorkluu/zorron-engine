/**
 * Standard application error response shape.
 */
export interface AppErrorResponse {
  /** Business error code, e.g. "AUTH_001". */
  code: string;
  /** Human-readable error message. */
  message: string;
  /** Debug details; only returned in development. */
  details?: unknown;
  /** Request trace identifier. */
  requestId: string;
}

/**
 * Application-specific error class.
 *
 * Carries a business error code and an optional HTTP status code for the
 * global error handler to map into a response.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
