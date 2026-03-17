import type { Request, Response } from 'express';
import { FamilyMemberModel } from '../../db/schemas/FamilyMember.js';
import { FamilyModel } from '../../db/schemas/Family.js';
import { ContactModel } from '../../db/schemas/Contact.js';

function getAuthUserId(req: Request): string | null {
  const auth = (req as Request & { auth?: { userId: string } }).auth;
  return auth?.userId ?? null;
}

async function canAccessFamily(familyId: string, userId: string): Promise<boolean> {
  const family = await FamilyModel.findById(familyId).lean({ virtuals: true });
  if (family && family.created_by === userId) return true;
  const member = await FamilyMemberModel.findOne({ family_id: familyId, user_id: userId }).lean({ virtuals: true });
  return Boolean(member);
}

export const contactsListController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const familyId = req.params.familyId;
    if (!familyId) {
      res.fail('familyId is required', 400);
      return;
    }

    if (!(await canAccessFamily(familyId, userId))) {
      res.fail('Forbidden', 403);
      return;
    }

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 200;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const filter: Record<string, any> = { family_id: familyId };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone_number: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    const contacts = await ContactModel.find(filter)
      .sort({ name: 1, phone_number: 1, _id: 1 })
      .limit(limit)
      .lean({ virtuals: true });

    res.success(
      contacts.map((c) => ({
        id: c._id,
        name: c.name,
        phone: c.phone,
        phone_ext: c.phone_ext,
        phone_number: c.phone_number,
        phone_norm: c.phone_norm,
        last_synced_at: c.last_synced_at ?? null,
      }))
    );
  },
};

