import type { Request, Response } from 'express';
import { eventsService } from './service.js';

function mapServiceError(error: unknown): { status: number; message: string } {
  if (!(error instanceof Error)) return { status: 500, message: 'Internal server error' };
  if (error.message === 'FAMILY_ID_REQUIRED') return { status: 400, message: 'family_id is required' };
  if (error.message === 'NAME_REQUIRED') return { status: 400, message: 'name is required' };
  if (error.message === 'CONTACT_ID_REQUIRED') return { status: 400, message: 'contact_id is required' };
  if (error.message === 'EVENT_NOT_FOUND') return { status: 404, message: 'Event not found' };
  if (error.message === 'CONTACT_NOT_FOUND') return { status: 404, message: 'Contact not found for this family' };
  if (error.message === 'PARTICIPANT_EXISTS') return { status: 409, message: 'Participant already linked to this event' };
  return { status: 500, message: error.message || 'Internal server error' };
}

export const eventsController = {
  async list(req: Request, res: Response): Promise<void> {
    const familyId = req.query.family_id;
    if (typeof familyId !== 'string' || !familyId.trim()) {
      res.fail('family_id is required', 400);
      return;
    }

    const events = await eventsService.listEvents(familyId.trim(), typeof req.query.status === 'string' ? req.query.status : undefined);
    res.success(events);
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const created = await eventsService.createEvent(req.body as {
        family_id?: string;
        name?: string;
        type?: string;
        start_date?: string;
        end_date?: string | null;
        location?: string;
        total_budget?: number | string;
        notes?: string;
        status?: string;
      });
      res.success(created, 'Created', 201);
    } catch (error) {
      const mapped = mapServiceError(error);
      res.fail(mapped.message, mapped.status);
    }
  },

  async get(req: Request, res: Response): Promise<void> {
    const familyId = req.query.family_id;
    if (typeof familyId !== 'string' || !familyId.trim()) {
      res.fail('family_id is required', 400);
      return;
    }

    const event = await eventsService.getEvent(familyId.trim(), req.params.id);
    if (!event) {
      res.fail('Event not found', 404);
      return;
    }
    res.success(event);
  },

  async update(req: Request, res: Response): Promise<void> {
    const familyId = req.query.family_id;
    if (typeof familyId !== 'string' || !familyId.trim()) {
      res.fail('family_id is required', 400);
      return;
    }

    const event = await eventsService.updateEvent(familyId.trim(), req.params.id, req.body as Record<string, unknown>);
    if (!event) {
      res.fail('Event not found', 404);
      return;
    }
    res.success(event);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const familyId = req.query.family_id;
    if (typeof familyId !== 'string' || !familyId.trim()) {
      res.fail('family_id is required', 400);
      return;
    }

    const deleted = await eventsService.deleteEvent(familyId.trim(), req.params.id);
    if (!deleted) {
      res.fail('Event not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  async createSubEvent(req: Request, res: Response): Promise<void> {
    try {
      const created = await eventsService.createSubEvent(req.params.id, req.body as {
        name?: string;
        date_time?: string;
        location?: string;
        budget?: number | string;
      });
      res.success(created, 'Created', 201);
    } catch (error) {
      const mapped = mapServiceError(error);
      res.fail(mapped.message, mapped.status);
    }
  },

  async listSubEvents(req: Request, res: Response): Promise<void> {
    try {
      const list = await eventsService.listSubEvents(req.params.id);
      res.success(list);
    } catch (error) {
      const mapped = mapServiceError(error);
      res.fail(mapped.message, mapped.status);
    }
  },

  async createParticipant(req: Request, res: Response): Promise<void> {
    try {
      const created = await eventsService.createParticipant(req.params.id, req.body as {
        contact_id?: string;
        role?: string;
        rsvp_status?: string;
      });
      res.success(created, 'Created', 201);
    } catch (error) {
      const mapped = mapServiceError(error);
      res.fail(mapped.message, mapped.status);
    }
  },

  async listParticipants(req: Request, res: Response): Promise<void> {
    try {
      const list = await eventsService.listParticipants(req.params.id);
      res.success(list);
    } catch (error) {
      const mapped = mapServiceError(error);
      res.fail(mapped.message, mapped.status);
    }
  },

  async financeSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await eventsService.getFinanceSummary(req.params.id);
      res.success(summary);
    } catch (error) {
      const mapped = mapServiceError(error);
      res.fail(mapped.message, mapped.status);
    }
  },

  async aiInsightPlaceholder(req: Request, res: Response): Promise<void> {
    try {
      const insight = await eventsService.getAiInsightPlaceholder(req.params.id);
      res.success(insight);
    } catch (error) {
      const mapped = mapServiceError(error);
      res.fail(mapped.message, mapped.status);
    }
  },
};
