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

export const contactsSummaryController = {
  async summary(req: Request, res: Response): Promise<void> {
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

    const total = await ContactModel.countDocuments({ family_id: familyId });
    const latest = await ContactModel.findOne({ family_id: familyId })
      .sort({ last_synced_at: -1, updatedAt: -1, _id: -1 })
      .select({ last_synced_at: 1 })
      .lean();

    res.success({
      total,
      last_synced_at: latest?.last_synced_at ?? null,
    });
  },
};

