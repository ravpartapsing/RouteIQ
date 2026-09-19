export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const unauthorized = (message = 'Sign in required') => new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have access to this') => new ApiError(403, 'FORBIDDEN', message);
export const notFound = (what: string) => new ApiError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (code: string, message: string, field?: string) =>
  new ApiError(409, code, message, field ? { [field]: message } : undefined);
