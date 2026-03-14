import type { Request, Response, NextFunction } from 'express';
import { success, error, type SuccessResponse, type ErrorResponse } from '../response.js';

export function responseMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.success = (data: unknown = null, message = 'Success', status = 200) => {
    const payload: SuccessResponse = success(data, message, status);
    res.status(status).json(payload);
  };
  res.fail = (msg: string, status = 400, errs?: unknown) => {
    const payload: ErrorResponse = error(msg, status, errs);
    res.status(status).json(payload);
  };
  next();
}

declare global {
  namespace Express {
    interface Response {
      success: (data?: unknown, message?: string, status?: number) => void;
      fail: (message: string, status?: number, errors?: unknown) => void;
    }
  }
}
