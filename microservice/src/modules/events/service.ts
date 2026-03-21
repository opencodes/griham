import { v4 as uuidv4 } from 'uuid';
import { EventModel, type EventStatus, type EventType, type IEventDoc } from '../../db/schemas/Event.js';
import { SubEventModel, type ISubEventDoc } from '../../db/schemas/SubEvent.js';
import {
  EventParticipantModel,
  type EventParticipantRole,
  type EventParticipantRsvpStatus,
  type IEventParticipantDoc,
} from '../../db/schemas/EventParticipant.js';
import { ContactModel } from '../../db/schemas/Contact.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';

function toId<T extends { _id: string }>(doc: T) {
  return { ...doc, id: doc._id } as T & { id: string };
}

function normalizeDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function parseRequiredDate(value: unknown, fallback?: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (fallback) return fallback;
  return new Date();
}

function parseOptionalDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  return parseRequiredDate(value);
}

function parseNumeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEventType(value: unknown): EventType {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'marriage' || normalized === 'anniversary' || normalized === 'birthday') return normalized;
  return 'other';
}

function normalizeEventStatus(value: unknown): EventStatus {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'ongoing' || normalized === 'completed') return normalized;
  return 'planned';
}

function normalizeParticipantRole(value: unknown): EventParticipantRole {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'vendor' || normalized === 'host') return normalized;
  return 'guest';
}

function normalizeRsvpStatus(value: unknown): EventParticipantRsvpStatus {
  const input = typeof value === 'string' ? value.trim() : '';
  const normalized = input.toLowerCase().replace(/[_\s]+/g, ' ');
  if (normalized === 'accepted' || normalized === 'invited') return 'Invited';
  if (normalized === 'declined' || normalized === 'pending' || normalized === 'pending invitation') return 'Pending Invitation';
  if (normalized === 'attended') return 'Attended';
  if (input) return input;
  return 'Pending Invitation';
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeGifts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim();
    if (!normalized) continue;
    unique.add(normalized);
  }
  return Array.from(unique);
}

function serializeEvent(doc: IEventDoc | (IEventDoc & { id?: string })) {
  return {
    ...toId(doc),
    start_date: normalizeDate(doc.start_date),
    end_date: normalizeDate(doc.end_date),
  };
}

function serializeSubEvent(doc: ISubEventDoc | (ISubEventDoc & { id?: string })) {
  return {
    ...toId(doc),
    date_time: normalizeDate(doc.date_time),
  };
}

function serializeParticipant(doc: IEventParticipantDoc | (IEventParticipantDoc & { id?: string }), contact?: Record<string, unknown> | null) {
  return {
    ...toId(doc),
    contact: contact ?? null,
  };
}

async function findEventOrThrow(eventId: string) {
  const event = await EventModel.findById(eventId);
  if (!event) throw new Error('EVENT_NOT_FOUND');
  return event;
}

export interface EventFinanceSummary {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  bySubEvent: Array<{
    subEventId: string | null;
    name: string;
    budget: number;
    totalSpent: number;
  }>;
}

export const eventsService = {
  async listEvents(familyId: string, status?: string) {
    const filter: Record<string, unknown> = { family_id: familyId };
    if (status) filter.status = normalizeEventStatus(status);
    const events = await EventModel.find(filter).sort({ start_date: -1, _id: -1 }).lean();
    return events.map((event) => serializeEvent(event));
  },

  async createEvent(body: {
    family_id?: string;
    name?: string;
    type?: string;
    start_date?: string;
    end_date?: string | null;
    location?: string;
    total_budget?: number | string;
    notes?: string;
    status?: string;
  }) {
    if (!body.family_id) throw new Error('FAMILY_ID_REQUIRED');
    if (!body.name?.trim()) throw new Error('NAME_REQUIRED');

    const id = uuidv4();
    const startDate = parseRequiredDate(body.start_date);
    await EventModel.create({
      _id: id,
      family_id: body.family_id,
      name: body.name.trim(),
      type: normalizeEventType(body.type),
      start_date: startDate,
      end_date: parseOptionalDate(body.end_date) ?? startDate,
      location: body.location?.trim() || null,
      total_budget: parseNumeric(body.total_budget),
      notes: body.notes?.trim() || null,
      status: normalizeEventStatus(body.status),
    });

    const event = await EventModel.findById(id).lean();
    return event ? serializeEvent(event) : null;
  },

  async getEvent(familyId: string, eventId: string) {
    const event = await EventModel.findOne({ _id: eventId, family_id: familyId }).lean();
    return event ? serializeEvent(event) : null;
  },

  async updateEvent(
    familyId: string,
    eventId: string,
    body: Partial<{
      name: string;
      type: string;
      start_date: string;
      end_date: string | null;
      location: string;
      total_budget: number | string;
      notes: string;
      status: string;
    }>
  ) {
    const event = await EventModel.findOne({ _id: eventId, family_id: familyId });
    if (!event) return null;

    if (body.name !== undefined) event.name = body.name.trim() || event.name;
    if (body.type !== undefined) event.type = normalizeEventType(body.type);
    if (body.start_date !== undefined) event.start_date = parseRequiredDate(body.start_date, event.start_date);
    if (body.end_date !== undefined) event.end_date = parseOptionalDate(body.end_date);
    if (body.location !== undefined) event.location = body.location.trim() || null;
    if (body.total_budget !== undefined) event.total_budget = parseNumeric(body.total_budget);
    if (body.notes !== undefined) event.notes = body.notes.trim() || null;
    if (body.status !== undefined) event.status = normalizeEventStatus(body.status);

    await event.save();
    return serializeEvent(event.toObject());
  },

  async deleteEvent(familyId: string, eventId: string) {
    const deleted = await EventModel.findOneAndDelete({ _id: eventId, family_id: familyId });
    if (!deleted) return false;

    await Promise.all([
      SubEventModel.deleteMany({ event_id: eventId }),
      EventParticipantModel.deleteMany({ event_id: eventId }),
    ]);
    return true;
  },

  async listSubEvents(eventId: string) {
    await findEventOrThrow(eventId);
    const subEvents = await SubEventModel.find({ event_id: eventId }).sort({ date_time: 1, _id: 1 }).lean();
    return subEvents.map((subEvent) => serializeSubEvent(subEvent));
  },

  async createSubEvent(
    eventId: string,
    body: {
      name?: string;
      date_time?: string;
      location?: string;
      budget?: number | string;
    }
  ) {
    await findEventOrThrow(eventId);
    if (!body.name?.trim()) throw new Error('NAME_REQUIRED');

    const id = uuidv4();
    await SubEventModel.create({
      _id: id,
      event_id: eventId,
      name: body.name.trim(),
      date_time: parseRequiredDate(body.date_time),
      location: body.location?.trim() || null,
      budget: parseNumeric(body.budget),
    });
    const subEvent = await SubEventModel.findById(id).lean();
    return subEvent ? serializeSubEvent(subEvent) : null;
  },

  async listParticipants(eventId: string) {
    const event = await findEventOrThrow(eventId);
    const participants = await EventParticipantModel.find({ event_id: eventId }).sort({ createdAt: 1, _id: 1 }).lean();
    const contactIds = participants.map((participant) => participant.contact_id);
    const contacts = contactIds.length > 0
      ? await ContactModel.find({ _id: { $in: contactIds }, family_id: event.family_id })
          .select('_id name phone email')
          .lean()
      : [];
    const contactById = new Map(contacts.map((contact) => [contact._id, { ...toId(contact) }]));

    return participants.map((participant) => serializeParticipant(participant, contactById.get(participant.contact_id) ?? null));
  },

  async createParticipant(
    eventId: string,
    body: {
      contact_id?: string;
      role?: string;
      rsvp_status?: string;
      gender?: string | null;
      age_group?: string | null;
      gifts?: string[];
    }
  ) {
    const event = await findEventOrThrow(eventId);
    if (!body.contact_id) throw new Error('CONTACT_ID_REQUIRED');

    const contact = await ContactModel.findOne({ _id: body.contact_id, family_id: event.family_id }).lean();
    if (!contact) throw new Error('CONTACT_NOT_FOUND');

    const existing = await EventParticipantModel.findOne({ event_id: eventId, contact_id: body.contact_id }).lean();
    if (existing) throw new Error('PARTICIPANT_EXISTS');

    const id = uuidv4();
    await EventParticipantModel.create({
      _id: id,
      event_id: eventId,
      contact_id: body.contact_id,
      role: normalizeParticipantRole(body.role),
      rsvp_status: normalizeRsvpStatus(body.rsvp_status),
      gender: normalizeOptionalString(body.gender),
      age_group: normalizeOptionalString(body.age_group),
      gifts: normalizeGifts(body.gifts),
    });

    const participant = await EventParticipantModel.findById(id).lean();
    return participant ? serializeParticipant(participant, { ...toId(contact) }) : null;
  },

  async updateParticipant(
    eventId: string,
    participantId: string,
    body: Partial<{
      role: string;
      rsvp_status: string;
      gender: string | null;
      age_group: string | null;
      gifts: string[];
    }>
  ) {
    const event = await findEventOrThrow(eventId);
    const participant = await EventParticipantModel.findOne({ _id: participantId, event_id: eventId });
    if (!participant) return null;

    if (body.role !== undefined) participant.role = normalizeParticipantRole(body.role);
    if (body.rsvp_status !== undefined) participant.rsvp_status = normalizeRsvpStatus(body.rsvp_status);
    if (body.gender !== undefined) participant.gender = normalizeOptionalString(body.gender);
    if (body.age_group !== undefined) participant.age_group = normalizeOptionalString(body.age_group);
    if (body.gifts !== undefined) participant.gifts = normalizeGifts(body.gifts);

    await participant.save();

    const contact = await ContactModel.findOne({ _id: participant.contact_id, family_id: event.family_id })
      .select('_id name phone email')
      .lean();

    return serializeParticipant(
      participant.toObject(),
      contact ? { ...toId(contact) } : null
    );
  },

  async deleteParticipant(eventId: string, participantId: string) {
    await findEventOrThrow(eventId);
    const deleted = await EventParticipantModel.findOneAndDelete({ _id: participantId, event_id: eventId });
    return Boolean(deleted);
  },

  async getFinanceSummary(eventId: string): Promise<EventFinanceSummary> {
    const event = await findEventOrThrow(eventId);

    const rows = await TransactionModel.aggregate<{
      _id: string | null;
      total_spent: number;
      expense_count: number;
    }>([
      { $match: { family_id: event.family_id, event_id: eventId } },
      {
        $group: {
          _id: '$sub_event_id',
          total_spent: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0],
            },
          },
          expense_count: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const subEvents = await SubEventModel.find({ event_id: eventId }).select('_id name budget').lean();
    const spentBySubEvent = new Map(rows.map((row) => [row._id ?? '__unassigned__', Number(row.total_spent ?? 0)]));
    const totalSpent = rows.reduce((sum, row) => sum + Number(row.total_spent ?? 0), 0);
    const unassignedSpent = spentBySubEvent.get('__unassigned__') ?? 0;

    return {
      totalBudget: Number(event.total_budget ?? 0),
      totalSpent,
      remainingBudget: Number(event.total_budget ?? 0) - totalSpent,
      bySubEvent: [
        ...subEvents.map((subEvent) => ({
          subEventId: subEvent._id,
          name: subEvent.name,
          budget: Number(subEvent.budget ?? 0),
          totalSpent: spentBySubEvent.get(subEvent._id) ?? 0,
        })),
        ...(unassignedSpent > 0
          ? [
              {
                subEventId: null,
                name: 'General Event Spend',
                budget: 0,
                totalSpent: unassignedSpent,
              },
            ]
          : []),
      ],
    };
  },

  async getAiInsightPlaceholder(eventId: string) {
    const event = await findEventOrThrow(eventId);
    const summary = await this.getFinanceSummary(eventId);
    return {
      eventId,
      message: `AI insights placeholder for ${event.name}. Budget used: ${summary.totalSpent} of ${summary.totalBudget}.`,
      ai_available: false,
    };
  },
};
