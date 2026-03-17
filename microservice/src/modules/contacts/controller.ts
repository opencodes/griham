import type { Request, Response } from 'express';
import { syncContacts } from './service.js';

type AuthedRequest = Request & { auth: { userId: string; email: string } };

export const contactsController = {
  sync: async (req: Request, res: Response): Promise<void> => {
    const { contacts, family_id, device_id } = (req.body ?? {}) as {
      contacts?: unknown;
      family_id?: unknown;
      device_id?: unknown;
    };

    if (!Array.isArray(contacts)) {
      res.fail('contacts must be an array', 400);
      return;
    }

    const familyId = typeof family_id === 'string' && family_id.trim() ? family_id.trim() : null;
    if (!familyId) {
      res.fail('family_id is required', 400);
      return;
    }

    const deviceId =
      typeof device_id === 'string' && device_id.trim() ? device_id.trim() : null;

    const userId = (req as AuthedRequest).auth.userId;

    const result = await syncContacts({
      userId,
      familyId,
      deviceId,
      contacts: contacts as any,
    });

    res.success({
      received: result.received,
      inserted: result.inserted,
      updated: result.updated,
      duplicates: result.duplicates,
    }, 'Contacts synced');
  },
};

