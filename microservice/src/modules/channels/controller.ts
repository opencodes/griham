import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ChannelModel, IChannelDoc } from '../../db/schemas/Channel.js';
import { ContentItemModel } from '../../db/schemas/ContentItem.js';

function getAuthUserId(req: Request): string | null {
  const auth = (req as Request & { auth?: { userId: string } }).auth;
  return auth?.userId ?? null;
}

export const channelsController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const body = req.body as {
      name?: string;
      logo_image_url?: string;
      youtube_url?: string;
      description?: string;
      upload_schedule?: string;
      target_monthly_uploads?: number;
      monthly_target_views?: number;
      color_tag?: string;
    };

    // Validation
    if (!body.name) {
      res.fail('Channel name is required', 400);
      return;
    }

    const channelId = uuidv4();
    const newChannel = await ChannelModel.create({
      _id: channelId,
      user_id: userId,
      name: body.name,
      logo_image_url: body.logo_image_url ?? null,
      youtube_url: body.youtube_url ?? null,
      description: body.description ?? null,
      upload_schedule: body.upload_schedule ?? 'Mon, Wed, Fri at 8:00 AM',
      target_monthly_uploads: body.target_monthly_uploads ?? 8,
      monthly_target_views: body.monthly_target_views ?? 5000,
      color_tag: body.color_tag ?? 'blue',
    });

    const channel = await ChannelModel.findById(channelId).lean({ virtuals: true });
    res.success(channel, 'Channel created successfully', 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const channels = await ChannelModel.find({ user_id: userId })
      .sort({ created_at: -1 })
      .lean({ virtuals: true });

    res.success(channels);
  },

  async get(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const channelId = req.params.id;
    const channel = await ChannelModel.findById(channelId).lean({ virtuals: true });

    if (!channel) {
      res.fail('Channel not found', 404);
      return;
    }

    if (channel.user_id !== userId) {
      res.fail('Forbidden', 403);
      return;
    }

    res.success(channel);
  },

  async update(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const channelId = req.params.id;
    const channel = await ChannelModel.findById(channelId).lean({ virtuals: true });

    if (!channel) {
      res.fail('Channel not found', 404);
      return;
    }

    if (channel.user_id !== userId) {
      res.fail('Forbidden', 403);
      return;
    }

    const body = req.body as Partial<IChannelDoc>;

    // Remove protected fields
    delete body._id;
    delete body.user_id;

    await ChannelModel.updateOne({ _id: channelId }, body);
    const updatedChannel = await ChannelModel.findById(channelId).lean({ virtuals: true });

    res.success(updatedChannel, 'Channel updated successfully');
  },

  async delete(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const channelId = req.params.id;
    const channel = await ChannelModel.findById(channelId).lean({ virtuals: true });

    if (!channel) {
      res.fail('Channel not found', 404);
      return;
    }

    if (channel.user_id !== userId) {
      res.fail('Forbidden', 403);
      return;
    }

    // Delete all content items associated with this channel
    await ContentItemModel.deleteMany({ channel_id: channelId });

    // Delete the channel
    await ChannelModel.deleteOne({ _id: channelId });

    res.success(null, 'Channel deleted successfully');
  },

  async getStats(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const channelId = req.params.id;
    const channel = await ChannelModel.findById(channelId).lean({ virtuals: true });

    if (!channel) {
      res.fail('Channel not found', 404);
      return;
    }

    if (channel.user_id !== userId) {
      res.fail('Forbidden', 403);
      return;
    }

    const items = await ContentItemModel.find({ channel_id: channelId }).lean();

    const stats = {
      channel_id: channelId,
      total_content_items: items.length,
      plan_count: items.filter((i) => i.status === 'plan').length,
      build_count: items.filter((i) => i.status === 'build').length,
      publish_count: items.filter((i) => i.status === 'publish').length,
    };

    res.success(stats);
  },
};
