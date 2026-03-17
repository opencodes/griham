import { randomUUID } from 'crypto';
import { ContactModel } from '../../db/schemas/Contact.js';

export type ContactSyncInput = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

function normalizePhone(phone: string): string {
  // Keep digits only. Works well enough for de-dupe across formats.
  return phone.replace(/\D+/g, '');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function syncContacts(params: {
  userId: string;
  familyId: string;
  deviceId?: string | null;
  contacts: ContactSyncInput[];
}): Promise<{ received: number; upserted: number; modified: number }> {
  const { userId, familyId, deviceId = null, contacts } = params;

  const ops = contacts
    .map((c) => {
      const name = (c.name ?? null)?.toString().trim() || null;
      const phone = (c.phone ?? null)?.toString().trim() || null;
      const email = (c.email ?? null)?.toString().trim() || null;

      const phoneNorm = phone ? normalizePhone(phone) : null;
      const emailNorm = email ? normalizeEmail(email) : null;

      // Skip totally empty contact rows
      if (!name && !phoneNorm && !emailNorm) return null;

      const filter =
        phoneNorm != null && phoneNorm.length > 0
          ? { family_id: familyId, phone_norm: phoneNorm }
          : { family_id: familyId, email_norm: emailNorm! };

      const now = new Date();
      return {
        updateOne: {
          filter,
          update: {
            $set: {
              family_id: familyId,
              user_id: userId,
              device_id: deviceId,
              name,
              phone,
              email,
              phone_norm: phoneNorm,
              email_norm: emailNorm,
              last_synced_at: now,
            },
            $setOnInsert: {
              _id: randomUUID(),
            },
          },
          upsert: true,
        },
      };
    })
    .filter(Boolean) as NonNullable<unknown>[];

  if (ops.length === 0) {
    return { received: contacts.length, upserted: 0, modified: 0 };
  }

  const res = await ContactModel.bulkWrite(ops as any, { ordered: false });
  return {
    received: contacts.length,
    upserted: res.upsertedCount ?? 0,
    modified: res.modifiedCount ?? 0,
  };
}

