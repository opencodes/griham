import type { Request, Response, NextFunction } from 'express';
import { UserModel } from '../../db/schemas/User.js';

type AuthRequest = Request & { auth?: { userId: string; email: string } };

export async function requireRoot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.auth?.userId) {
        res.fail('Unauthorized', 401);
        return;
    }
    const user = await UserModel.findById(req.auth.userId).lean();
    if (!user || user.role !== 'root') {
        res.fail('Forbidden', 403);
        return;
    }
    next();
}