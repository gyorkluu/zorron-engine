/**
 * Shared error types for the editor.
 *
 * Mirrors the backend `AppError` shape so the UI can switch on `code`.
 */

/** Standardized application error shape (matches backend ErrorResponseSchema). */
export interface AppErrorShape {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
  status: number;
}

/** Application error class thrown by the service layer. */
export class AppError extends Error {
  code: string;
  status: number;
  requestId: string;
  details?: unknown;

  constructor(shape: AppErrorShape) {
    super(shape.message);
    this.name = 'AppError';
    this.code = shape.code;
    this.status = shape.status;
    this.requestId = shape.requestId;
    this.details = shape.details;
  }

  /** Serialize back to the plain shape (for logging / JSON transport). */
  toJSON(): AppErrorShape {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      requestId: this.requestId,
      status: this.status,
    };
  }
}

/** Type guard: is the value an AppError? */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
