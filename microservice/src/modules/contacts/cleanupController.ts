import type { Request, Response } from 'express';
import { FamilyMemberModel } from '../../db/schemas/FamilyMember.js';
import { FamilyModel } from '../../db/schemas/Family.js';
import { ContactModel } from '../../db/schemas/Contact.js';
import * as ai from '../../lib/ai/index.js';

type AuthedRequest = Request & { auth?: { userId: string } };

type CleanupSuggestion = {
  id: string;
  reasons: string[];
  ai_reason?: string;
};

const PHONE_LENGTH_BY_COUNTRY: Record<string, number> = {
  IN: 10,
  US: 10,
  CA: 10,
  GB: 10,
  AU: 9,
};

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

function normalizeName(name: string | null | undefined): string {
  return (name ?? '').trim().toLowerCase();
}

function isPhoneValid(raw: string, country: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return false;
  if (raw.trim().startsWith('+')) return digits.length >= 10 && digits.length <= 15;
  const expected = PHONE_LENGTH_BY_COUNTRY[country] ?? 10;
  return digits.length === expected;
}

function isTollFreeNumber(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return false;
  // US/CA toll-free prefixes
  if (digits.length === 10 && /^(800|888|877|866|855|844|833|822)/.test(digits)) return true;
  // India toll-free patterns
  if (digits.startsWith('1800') || digits.startsWith('1860')) return true;
  return false;
}

function isRepeatedDigits(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 6 && /^(\d)\1+$/.test(digits);
}

function isNameMostlyDigits(name: string): boolean {
  const cleaned = name.replace(/\s+/g, '');
  if (!cleaned) return false;
  const digits = cleaned.replace(/\D/g, '');
  return digits.length / cleaned.length > 0.6;
}

function isEmailInvalid(email: string): boolean {
  return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeParseJsonArray(text: string | null): Array<{ id?: string; reason?: string }> {
  if (!text) return [];
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (Array.isArray(parsed)) return parsed as Array<{ id?: string; reason?: string }>;
    return [];
  } catch {
    return [];
  }
}

async function getAiSuggestions(
  contacts: Array<{ id: string; name: string | null; phone: string | null; email: string | null }>
): Promise<Array<{ id: string; reason: string }>> {
  if (!ai.isAiAvailable()) return [];
  const model = ai.getDefaultTextModel();
  const max = 120;
  const payload = contacts.slice(0, max).map((c) => ({
    id: c.id,
    name: c.name ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
  }));
  const prompt = `You are a contact cleanup assistant. Identify contacts that look like junk, corrupted, or placeholders.
Return ONLY a JSON array of objects: [{"id":"<id>","reason":"<short reason>"}].
Use only the provided ids. If none, return [].
Contacts: ${JSON.stringify(payload)}`;
  const out = await ai.textGeneration(model, prompt, { max_new_tokens: 300, temperature: 0 });
  const parsed = safeParseJsonArray(out);
  const validIds = new Set(payload.map((c) => c.id));
  return parsed
    .filter((item) => item.id && validIds.has(item.id))
    .map((item) => ({ id: item.id as string, reason: String(item.reason || 'AI suspected junk') }));
}

export const contactsCleanupController = {
  async suggestions(req: Request, res: Response): Promise<void> {
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

    const country = typeof req.query.country === 'string' && req.query.country.trim()
      ? req.query.country.trim().toUpperCase()
      : 'IN';
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 200;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const contacts = await ContactModel.find({ family_id: familyId })
      .sort({ name: 1, phone_number: 1, _id: 1 })
      .limit(limit)
      .lean({ virtuals: true });

    const nameCounts = new Map<string, number>();
    contacts.forEach((c) => {
      const key = normalizeName(c.name);
      if (!key) return;
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    });

    const suggestions = new Map<string, CleanupSuggestion>();

    const addReason = (id: string, reason: string) => {
      const entry = suggestions.get(id) ?? { id, reasons: [] };
      if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
      suggestions.set(id, entry);
    };

    contacts.forEach((c) => {
      const name = (c.name ?? '').trim();
      const phone = (c.phone ?? '').trim();
      const nameLower = name.toLowerCase();
      const phoneDigits = phone.replace(/\D/g, '');

      if (!name) addReason(c._id, 'missing_name');
      if (!phone) addReason(c._id, 'missing_phone');

      if (name && phone) {
        const nameIncludesPhone = nameLower.includes(phoneDigits) || nameLower.includes(phone);
        const startsWithPhone = nameLower.startsWith(phoneDigits) || nameLower.startsWith(phone);
        if (nameIncludesPhone || startsWithPhone) addReason(c._id, 'name_phone');
      }

      if (phone && !isPhoneValid(phone, country) && !isTollFreeNumber(phone)) addReason(c._id, 'invalid_phone');
      if (phone && isRepeatedDigits(phone)) addReason(c._id, 'phone_repeated');

      if (name && name.length < 2) addReason(c._id, 'name_too_short');
      if (name && isNameMostlyDigits(name)) addReason(c._id, 'name_mostly_digits');

      if (name && (nameCounts.get(normalizeName(name)) || 0) > 1) addReason(c._id, 'duplicate_name');

      if (c.email && isEmailInvalid(c.email)) addReason(c._id, 'email_invalid');
    });

    const aiSuggestions = await getAiSuggestions(
      contacts.map((c) => ({
        id: c._id,
        name: c.name ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
      }))
    );

    aiSuggestions.forEach((s) => {
      const entry = suggestions.get(s.id) ?? { id: s.id, reasons: [] };
      if (!entry.reasons.includes('ai_suspected')) entry.reasons.push('ai_suspected');
      entry.ai_reason = s.reason;
      suggestions.set(s.id, entry);
    });

    res.success(
      {
        suggestions: Array.from(suggestions.values()),
        ai_available: ai.isAiAvailable(),
        ai_used: ai.isAiAvailable() && aiSuggestions.length > 0,
      },
      'Cleanup suggestions'
    );
  },

  async apply(req: Request, res: Response): Promise<void> {
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

    const country = typeof req.query.country === 'string' && req.query.country.trim()
      ? req.query.country.trim().toUpperCase()
      : 'IN';
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 500;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 500;

    const contacts = await ContactModel.find({ family_id: familyId })
      .sort({ updated_at: -1, created_at: -1, _id: 1 })
      .limit(limit)
      .lean({ virtuals: true });

    const nameGroups = new Map<string, typeof contacts>();
    contacts.forEach((c) => {
      const key = normalizeName(c.name);
      if (!key) return;
      const arr = nameGroups.get(key) ?? [];
      arr.push(c);
      nameGroups.set(key, arr);
    });

    const toDelete = new Set<string>();
    const reasonsById = new Map<string, string[]>();
    const addReason = (id: string, reason: string) => {
      const list = reasonsById.get(id) ?? [];
      if (!list.includes(reason)) list.push(reason);
      reasonsById.set(id, list);
    };

    contacts.forEach((c) => {
      const name = (c.name ?? '').trim();
      const phone = (c.phone ?? '').trim();
      const nameLower = name.toLowerCase();
      const phoneDigits = phone.replace(/\D/g, '');

      if (!phone) {
        toDelete.add(c._id);
        addReason(c._id, 'missing_phone');
        return;
      }

      if (name && phone) {
        const nameIncludesPhone = nameLower.includes(phoneDigits) || nameLower.includes(phone);
        const startsWithPhone = nameLower.startsWith(phoneDigits) || nameLower.startsWith(phone);
        if (nameIncludesPhone || startsWithPhone) {
          toDelete.add(c._id);
          addReason(c._id, 'name_phone');
        }
      }
    });

    const scoreContact = (c: (typeof contacts)[number]) => {
      let score = 0;
      const name = (c.name ?? '').trim();
      const phone = (c.phone ?? '').trim();
      const email = (c.email ?? '').trim();

      if (email) score += 3;
      if (phone && (isPhoneValid(phone, country) || isTollFreeNumber(phone))) score += 3;
      if (name && name.length >= 3) score += 1;
      if (name && !isNameMostlyDigits(name)) score += 1;
      if (phone && !isRepeatedDigits(phone)) score += 1;

      if (phone && !isPhoneValid(phone, country) && !isTollFreeNumber(phone)) score -= 3;
      if (phone && isRepeatedDigits(phone)) score -= 2;
      if (name && isNameMostlyDigits(name)) score -= 2;
      if (name && name.length < 2) score -= 2;

      const nameLower = name.toLowerCase();
      const phoneDigits = phone.replace(/\D/g, '');
      if (name && phone && (nameLower.includes(phoneDigits) || nameLower.includes(phone))) score -= 2;

      return score;
    };

    nameGroups.forEach((group, key) => {
      if (group.length <= 1) return;
      const scored = group.map((c) => ({ c, score: scoreContact(c) }));
      scored.sort((a, b) => b.score - a.score || String(a.c._id).localeCompare(String(b.c._id)));
      const keep = scored[0]?.c;
      scored.slice(1).forEach(({ c }) => {
        toDelete.add(c._id);
        addReason(c._id, `duplicate_name:${key}`);
      });
      if (keep) {
        // if tied, still keep the first and delete others (per requirement)
      }
    });

    const ids = Array.from(toDelete);
    if (ids.length === 0) {
      res.success({ deleted: 0, ids: [], reasons: {} }, 'No cleanup required');
      return;
    }

    await ContactModel.deleteMany({ _id: { $in: ids } });

    const reasons: Record<string, string[]> = {};
    reasonsById.forEach((val, key) => {
      reasons[key] = val;
    });

    res.success(
      {
        deleted: ids.length,
        ids,
        reasons,
      },
      'Cleanup applied'
    );
  },
};
