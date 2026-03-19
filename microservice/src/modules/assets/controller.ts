import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AssetModel, type AssetType, type IAssetDoc } from '../../db/schemas/Asset.js';

function toId<T extends { _id: string }>(doc: T) {
  return { ...doc, id: doc._id } as T & { id: string };
}

function normalizeDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function serializeAsset(doc: IAssetDoc | (IAssetDoc & { id?: string })) {
  return {
    ...toId(doc),
    purchase_date: normalizeDate(doc.purchase_date),
    expiry_date: normalizeDate(doc.expiry_date),
  };
}

function normalizeAssetType(value?: string): AssetType {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'property' || normalized === 'vehicle' || normalized === 'gadget' || normalized === 'document') {
    return normalized;
  }
  return 'gadget';
}

function parseNumeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const assetsController = {
  async list(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId;
    const type = typeof req.query.type === 'string' ? normalizeAssetType(req.query.type) : undefined;
    const filter: Record<string, unknown> = { family_id: familyId };
    if (type) filter.asset_type = type;

    const assets = await AssetModel.find(filter).sort({ updatedAt: -1, _id: -1 }).lean();
    res.success(assets.map((asset) => serializeAsset(asset)));
  },

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      asset_type?: string;
      name?: string;
      description?: string;
      purchase_date?: string;
      purchase_price?: number | string;
      current_value?: number | string;
      location?: string;
      expiry_date?: string;
    };

    if (!body.family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    if (!body.name?.trim()) {
      res.fail('name is required', 400);
      return;
    }

    const id = uuidv4();
    await AssetModel.create({
      _id: id,
      family_id: body.family_id,
      asset_type: normalizeAssetType(body.asset_type),
      name: body.name.trim(),
      description: body.description?.trim() || null,
      purchase_date: parseOptionalDate(body.purchase_date),
      purchase_price: parseNumeric(body.purchase_price),
      current_value: parseNumeric(body.current_value),
      location: body.location?.trim() || null,
      expiry_date: parseOptionalDate(body.expiry_date),
    });

    const asset = await AssetModel.findById(id).lean();
    res.success(asset ? serializeAsset(asset) : null, 'Created', 201);
  },

  async get(req: Request, res: Response): Promise<void> {
    const asset = await AssetModel.findOne({
      _id: req.params.assetId,
      family_id: req.params.familyId,
    }).lean();

    if (!asset) {
      res.fail('Asset not found', 404);
      return;
    }

    res.success(serializeAsset(asset));
  },

  async update(req: Request, res: Response): Promise<void> {
    const asset = await AssetModel.findOne({
      _id: req.params.assetId,
      family_id: req.params.familyId,
    });

    if (!asset) {
      res.fail('Asset not found', 404);
      return;
    }

    const body = req.body as Partial<{
      asset_type: string;
      name: string;
      description: string;
      purchase_date: string;
      purchase_price: number | string;
      current_value: number | string;
      location: string;
      expiry_date: string;
    }>;

    if (body.asset_type !== undefined) asset.asset_type = normalizeAssetType(body.asset_type);
    if (body.name !== undefined) asset.name = body.name.trim() || asset.name;
    if (body.description !== undefined) asset.description = body.description.trim() || null;
    if (body.purchase_date !== undefined) asset.purchase_date = parseOptionalDate(body.purchase_date);
    if (body.purchase_price !== undefined) asset.purchase_price = parseNumeric(body.purchase_price);
    if (body.current_value !== undefined) asset.current_value = parseNumeric(body.current_value);
    if (body.location !== undefined) asset.location = body.location.trim() || null;
    if (body.expiry_date !== undefined) asset.expiry_date = parseOptionalDate(body.expiry_date);

    await asset.save();
    res.success(serializeAsset(asset.toObject()));
  },

  async remove(req: Request, res: Response): Promise<void> {
    const deleted = await AssetModel.findOneAndDelete({
      _id: req.params.assetId,
      family_id: req.params.familyId,
    });

    if (!deleted) {
      res.fail('Asset not found', 404);
      return;
    }

    res.success({ ok: true });
  },

  async expiringDocuments(req: Request, res: Response): Promise<void> {
    const days = Math.max(0, Number(req.query.days) || 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + days);

    const assets = await AssetModel.find({
      family_id: req.params.familyId,
      expiry_date: { $gte: today, $lte: limit },
    })
      .sort({ expiry_date: 1, _id: 1 })
      .lean();

    res.success(assets.map((asset) => serializeAsset(asset)));
  },

  async serviceDue(req: Request, res: Response): Promise<void> {
    const days = Math.max(0, Number(req.query.days) || 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + days);

    const vehicles = await AssetModel.find({
      family_id: req.params.familyId,
      asset_type: 'vehicle',
      expiry_date: { $gte: today, $lte: limit },
    })
      .sort({ expiry_date: 1, _id: 1 })
      .lean();

    res.success(vehicles.map((asset) => serializeAsset(asset)));
  },

  async valuation(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId;
    const valuation = await AssetModel.aggregate<{ total_value: number; asset_count: number }>([
      { $match: { family_id: familyId } },
      {
        $group: {
          _id: null,
          total_value: { $sum: '$current_value' },
          asset_count: { $sum: 1 },
        },
      },
    ]);

    const summary = valuation[0] ?? { total_value: 0, asset_count: 0 };
    res.success(summary);
  },
};
