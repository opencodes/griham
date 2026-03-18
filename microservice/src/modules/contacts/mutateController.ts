import type { Request, Response } from 'express';
import { FamilyMemberModel } from '../../db/schemas/FamilyMember.js';
import { FamilyModel } from '../../db/schemas/Family.js';
import { ContactModel } from '../../db/schemas/Contact.js';

type AuthedRequest = Request & { auth?: { userId: string } };

function getAuthUserId(req: Request): string | null {
  const auth = (req as AuthedRequest).auth;
  return auth?.userId ?? null;
}

async function canAccessFamily(familyId: string, userId: string): Promise<boolean> {
  const family = await FamilyModel.findById(familyId).lean({ virtuals: true });
  if (family && family.created_by === userId) return true;
  const member = await FamilyMemberModel.findOne({ family_id: familyId, user_id: userId }).lean({ virtuals: true });
  return Boolean(member);
}

function digitsOnly(s: string): string {
  return s.replace(/\D+/g, '');
}

function splitPhone(phoneRaw: string): {
  phoneExt: string | null;
  phoneNumber: string | null;
  phoneNorm: string | null;
} {
  const raw = phoneRaw.trim();
  if (!raw) return { phoneExt: null, phoneNumber: null, phoneNorm: null };

  const m = raw.match(/^\+(\d{1,4})\b/);
  const extDigits = m?.[1] ?? null;
  const phoneExt = extDigits ? `+${extDigits}` : null;

  const rest = extDigits ? raw.slice(m![0].length).trim() : raw;
  const phoneNumber = digitsOnly(rest) || null;

  const phoneNorm = digitsOnly(`${extDigits ?? ''}${phoneNumber ?? ''}`) || null;
  return { phoneExt, phoneNumber, phoneNorm };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const contactsMutateController = {
  async update(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const contactId = req.params.id;
    if (!contactId) {
      res.fail('id is required', 400);
      return;
    }

    const body = (req.body ?? {}) as { name?: unknown; phone?: unknown; email?: unknown };
    const nameRaw = typeof body.name === 'string' ? body.name.trim() : '';
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';

    if (!phoneRaw) {
      res.fail('phone is required', 400);
      return;
    }

    const { phoneExt, phoneNumber, phoneNorm } = splitPhone(phoneRaw);
    if (!phoneNumber || !phoneNorm) {
      res.fail('phone is invalid', 400);
      return;
    }

    const contact = await ContactModel.findById(contactId).lean({ virtuals: true });
    if (!contact) {
      res.fail('Not found', 404);
      return;
    }

    if (!(await canAccessFamily(contact.family_id, userId))) {
      res.fail('Forbidden', 403);
      return;
    }

    const name = nameRaw || 'Unknown Name';
    const email = emailRaw || null;
    const emailNorm = email ? normalizeEmail(email) : null;

    try {
      await ContactModel.updateOne(
        { _id: contactId },
        {
          $set: {
            name,
            phone: phoneRaw,
            phone_ext: phoneExt,
            phone_number: phoneNumber,
            phone_norm: phoneNorm,
            email,
            email_norm: emailNorm,
          },
        }
      );
    } catch (err: any) {
      if (err && typeof err === 'object' && err.code === 11000) {
        res.fail('Duplicate phone number for this family', 409);
        return;
      }
      res.fail('Failed to update contact', 500);
      return;
    }

    const updated = await ContactModel.findById(contactId).lean({ virtuals: true });
    if (!updated) {
      res.fail('Not found', 404);
      return;
    }

    res.success(
      {
        id: updated._id,
        name: updated.name,
        phone: updated.phone,
        phone_ext: updated.phone_ext,
        phone_number: updated.phone_number,
        email: updated.email,
        phone_norm: updated.phone_norm,
        last_synced_at: updated.last_synced_at ?? null,
      },
      'Contact updated'
    );
  },

  async remove(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const contactId = req.params.id;
    if (!contactId) {
      res.fail('id is required', 400);
      return;
    }

    const contact = await ContactModel.findById(contactId).lean({ virtuals: true });
    if (!contact) {
      res.fail('Not found', 404);
      return;
    }

    if (!(await canAccessFamily(contact.family_id, userId))) {
      res.fail('Forbidden', 403);
      return;
    }

    await ContactModel.deleteOne({ _id: contactId });
    res.success({ id: contactId }, 'Contact deleted');
  },
};
