import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ContentItemModel, IContentItemDoc } from '../../db/schemas/ContentItem.js';
import { ChannelModel } from '../../db/schemas/Channel.js';

function getAuthUserId(req: Request): string | null {
  const auth = (req as Request & { auth?: { userId: string } }).auth;
  return auth?.userId ?? null;
}

async function verifyChannelAccess(channelId: string, userId: string): Promise<boolean> {
  const channel = await ChannelModel.findById(channelId).lean();
  return channel?.user_id === userId;
}

export const contentTrackerController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const body = req.body as {
      channel_id?: string;
      episode_number?: number;
      title?: string;
      description?: string;
      status?: 'plan' | 'build' | 'publish';
      planned_month?: string;
      planned_publish_date?: string;
      video_length_seconds?: number;
      tags?: string[];
      notes?: string;
    };

    // Validation
    if (!body.channel_id) {
      res.fail('Channel ID is required', 400);
      return;
    }
    if (!body.title) {
      res.fail('Title is required', 400);
      return;
    }
    if (body.episode_number === undefined || body.episode_number === null) {
      res.fail('Episode number is required', 400);
      return;
    }
    if (body.episode_number < 1) {
      res.fail('Episode number must be positive', 400);
      return;
    }

    // Verify channel access
    const hasAccess = await verifyChannelAccess(body.channel_id, userId);
    if (!hasAccess) {
      res.fail('Channel not found or access denied', 404);
      return;
    }

    const status = body.status ?? 'plan';
    if (!['plan', 'build', 'publish'].includes(status)) {
      res.fail('Status must be one of: plan, build, publish', 400);
      return;
    }

    const contentId = uuidv4();
    const newContent = await ContentItemModel.create({
      _id: contentId,
      channel_id: body.channel_id,
      episode_number: body.episode_number,
      title: body.title,
      description: body.description ?? null,
      status,
      planned_month: body.planned_month ?? null,
      planned_publish_date: body.planned_publish_date ? new Date(body.planned_publish_date) : null,
      video_length_seconds: body.video_length_seconds ?? null,
      tags: body.tags ?? [],
      notes: body.notes ?? null,
      created_by: userId,
    });

    const content = await ContentItemModel.findById(contentId).lean({ virtuals: true });
    res.success(content, 'Content item created successfully', 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const channelId = req.query.channel_id as string | undefined;

    let query: any = { created_by: userId };
    if (channelId) {
      const hasAccess = await verifyChannelAccess(channelId, userId);
      if (!hasAccess) {
        res.fail('Channel not found or access denied', 404);
        return;
      }
      query.channel_id = channelId;
    }

    const contents = await ContentItemModel.find(query)
      .sort({ episode_number: 1 })
      .lean({ virtuals: true });

    res.success(contents);
  },

  async get(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const contentId = req.params.id;
    const content = await ContentItemModel.findById(contentId).lean({ virtuals: true });

    if (!content) {
      res.fail('Content item not found', 404);
      return;
    }

    if (content.created_by !== userId) {
      res.fail('Forbidden', 403);
      return;
    }

    res.success(content);
  },

  async update(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const contentId = req.params.id;
    const content = await ContentItemModel.findById(contentId).lean({ virtuals: true });

    if (!content) {
      res.fail('Content item not found', 404);
      return;
    }

    if (content.created_by !== userId) {
      res.fail('Forbidden', 403);
      return;
    }

    const body = req.body as {
      episode_number?: number;
      title?: string;
      description?: string;
      status?: 'plan' | 'build' | 'publish';
      planned_date?: string | null;
      start_build_date?: string | null;
      published_date?: string | null;
      planned_month?: string;
      planned_publish_date?: string;
      video_length_seconds?: number;
      tags?: string[];
      notes?: string;
    };

    // Validate if status is being updated
    if (body.status && !['plan', 'build', 'publish'].includes(body.status)) {
      res.fail('Status must be one of: plan, build, publish', 400);
      return;
    }

    if (body.episode_number !== undefined && body.episode_number < 1) {
      res.fail('Episode number must be positive', 400);
      return;
    }

    // Build update object
    const updateData: Partial<IContentItemDoc> = {};
    if (body.episode_number !== undefined) updateData.episode_number = body.episode_number;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.planned_month !== undefined) updateData.planned_month = body.planned_month;
    if (body.planned_publish_date !== undefined)
      updateData.planned_publish_date = body.planned_publish_date ? new Date(body.planned_publish_date) : null;
    if (body.video_length_seconds !== undefined) updateData.video_length_seconds = body.video_length_seconds;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (body.status !== undefined) {
      updateData.status = body.status;
      // Auto-populate timestamps based on status
      if (body.status === 'build' && !body.start_build_date) {
        updateData.start_build_date = new Date();
      }
      if (body.status === 'publish' && !body.published_date) {
        updateData.published_date = new Date();
      }
    }

    // Handle explicit date updates
    if (body.planned_date !== undefined) updateData.planned_date = body.planned_date ? new Date(body.planned_date) : null;
    if (body.start_build_date !== undefined) updateData.start_build_date = body.start_build_date ? new Date(body.start_build_date) : null;
    if (body.published_date !== undefined) updateData.published_date = body.published_date ? new Date(body.published_date) : null;

    await ContentItemModel.updateOne({ _id: contentId }, updateData);
    const updatedContent = await ContentItemModel.findById(contentId).lean({ virtuals: true });

    res.success(updatedContent, 'Content item updated successfully');
  },

  async delete(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const contentId = req.params.id;
    const content = await ContentItemModel.findById(contentId).lean({ virtuals: true });

    if (!content) {
      res.fail('Content item not found', 404);
      return;
    }

    if (content.created_by !== userId) {
      res.fail('Forbidden', 403);
      return;
    }

    await ContentItemModel.deleteOne({ _id: contentId });
    res.success(null, 'Content item deleted successfully');
  },
};

