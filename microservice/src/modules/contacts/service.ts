import { randomUUID } from 'crypto';
import { ContactModel } from '../../db/schemas/Contact.js';

export type ContactSyncInput = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

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

  // If it starts with +<digits>, treat that as extension/country code.
  // Example: "+91 70223 68755" -> ext "+91", number "7022368755"
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

export async function syncContacts(params: {
  userId: string;
  familyId: string;
  deviceId?: string | null;
  contacts: ContactSyncInput[];
}): Promise<{
  received: number;
  inserted: number;
  updated: number;
  duplicates: number;
}> {
  const { userId, familyId, deviceId = null, contacts } = params;

  const prepared = contacts.map((c) => {
    const name = (c.name ?? null)?.toString().trim() || null;
    const phone = (c.phone ?? null)?.toString().trim() || null;
    const email = (c.email ?? null)?.toString().trim() || null;

    const { phoneExt, phoneNumber, phoneNorm } = phone
      ? splitPhone(phone)
      : { phoneExt: null, phoneNumber: null, phoneNorm: null };
    const emailNorm = email ? normalizeEmail(email) : null;

    return { name, phone, email, phoneExt, phoneNumber, phoneNorm, emailNorm };
  });

  const incomingPhoneNumbers = Array.from(
    new Set(
      prepared
        .map((p) => p.phoneNumber)
        .filter((n): n is string => typeof n === 'string' && n.length > 0)
    )
  );

  const existingPhoneSet = new Set<string>();
  if (incomingPhoneNumbers.length > 0) {
    const existing = await ContactModel.find({
      family_id: familyId,
      phone_number: { $in: incomingPhoneNumbers },
    })
      .select({ phone_number: 1 })
      .lean();
    for (const doc of existing) {
      if (doc.phone_number) existingPhoneSet.add(doc.phone_number);
    }
  }

  let duplicates = 0;

  const ops = contacts
    .map((c) => {
      const name = (c.name ?? null)?.toString().trim() || null;
      const phone = (c.phone ?? null)?.toString().trim() || null;
      const email = (c.email ?? null)?.toString().trim() || null;

      const { phoneExt, phoneNumber, phoneNorm } = phone
        ? splitPhone(phone)
        : { phoneExt: null, phoneNumber: null, phoneNorm: null };
      const emailNorm = email ? normalizeEmail(email) : null;

      // Skip totally empty contact rows
      if (!name && !phoneNorm && !emailNorm) return null;

      const hasPhone = phoneNumber != null && phoneNumber.length > 0;
      // Per requirement: only store contacts with a phone number.
      if (!hasPhone) return null;
      if (hasPhone && existingPhoneSet.has(phoneNumber)) {
        duplicates += 1;
        return null;
      }

      const filter = hasPhone
        ? { family_id: familyId, phone_number: phoneNumber }
        : { family_id: familyId, email_norm: emailNorm! };

      const now = new Date();
      return {
        updateOne: {
          filter,
          update: {
            // For phone-number records: don't overwrite existing; only insert if new.
            $setOnInsert: {
              _id: randomUUID(),
              family_id: familyId,
              user_id: userId,
              device_id: deviceId,
              name,
              phone,
              phone_ext: phoneExt,
              phone_number: phoneNumber,
              email,
              phone_norm: phoneNorm,
              email_norm: emailNorm,
              last_synced_at: now,
            },
          },
          upsert: true,
        },
      };
    })
    .filter(Boolean) as NonNullable<unknown>[];

  if (ops.length === 0) {
    console.log(`[contacts.sync] family=${familyId} received=${contacts.length} inserted=0 updated=0 duplicates=${duplicates}`);
    return { received: contacts.length, inserted: 0, updated: 0, duplicates };
  }

  const res = await ContactModel.bulkWrite(ops as any, { ordered: false });
  const inserted = res.upsertedCount ?? 0;
  const updated = res.modifiedCount ?? 0;
  console.log(
    `[contacts.sync] family=${familyId} received=${contacts.length} inserted=${inserted} updated=${updated} duplicates=${duplicates}`
  );
  return {
    received: contacts.length,
    inserted,
    updated,
    duplicates,
  };
}

