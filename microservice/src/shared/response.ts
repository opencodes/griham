/**
 * Standard API response shapes (success/error).
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  status: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  status: number;
}

export function success<T>(data: T = null as T, message = 'Success', status = 200): SuccessResponse<T> {
  return { success: true, message, data, status };
}

export function error(message: string, status = 400, errors: unknown = null): ErrorResponse {
  return { success: false, message, errors: errors ?? undefined, status };
}
