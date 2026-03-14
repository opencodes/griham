import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FamilyModel } from '../../db/schemas/Family.js';
import { FamilyMemberModel } from '../../db/schemas/FamilyMember.js';

function getAuthUserId(req: Request): string | null {
  const auth = (req as Request & { auth?: { userId: string } }).auth;
  return auth?.userId ?? null;
}

async function isFamilyCreator(familyId: string, userId: string): Promise<boolean> {
  const family = await FamilyModel.findById(familyId).lean();
  return Boolean(family && family.created_by === userId);
}

async function getMemberRole(familyId: string, userId: string): Promise<string | null> {
  const member = await FamilyMemberModel.findOne({ family_id: familyId, user_id: userId }).lean();
  return member?.role ?? null;
}

async function canAccessFamily(familyId: string, userId: string): Promise<boolean> {
  if (await isFamilyCreator(familyId, userId)) {
    return true;
  }
  const member = await FamilyMemberModel.findOne({ family_id: familyId, user_id: userId }).lean();
  return Boolean(member);
}

export const familiesController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const body = req.body as { name?: string; address?: string | null };
    if (!body.name) {
      res.fail('Family name is required', 400);
      return;
    }

    const familyId = uuidv4();
    await FamilyModel.create({
      _id: familyId,
      name: body.name,
      address: body.address ?? null,
      created_by: userId,
    });

    await FamilyMemberModel.create({
      _id: uuidv4(),
      family_id: familyId,
      user_id: userId,
      role: 'admin',
      status: 'active',
      invitation_email: null,
      invitation_sent_at: null,
      joined_at: new Date(),
    });

    const family = await FamilyModel.findById(familyId).lean();
    res.success(family, 'Family created', 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const memberFamilies = await FamilyMemberModel.find({ user_id: userId })
      .select('family_id')
      .lean();
    const familyIds = memberFamilies.map((m) => m.family_id);

    const families = await FamilyModel.find({
      $or: [{ created_by: userId }, { _id: { $in: familyIds } }],
    }).lean();

    res.success(families);
  },

  async getCurrent(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const member = await FamilyMemberModel.findOne({ user_id: userId }).lean();
    const family = member
      ? await FamilyModel.findById(member.family_id).lean()
      : await FamilyModel.findOne({ created_by: userId }).lean();

    if (!family) {
      res.fail('Family not found', 404);
      return;
    }

    res.success(family);
  },

  async get(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const familyId = req.params.id;
    if (!(await canAccessFamily(familyId, userId))) {
      res.fail('Forbidden', 403);
      return;
    }

    const family = await FamilyModel.findById(familyId).lean();
    if (!family) {
      res.fail('Family not found', 404);
      return;
    }

    res.success(family);
  },

  async updateAddress(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const familyId = req.params.id;
    const family = await FamilyModel.findById(familyId).lean();
    if (!family) {
      res.fail('Family not found', 404);
      return;
    }

    if (family.created_by !== userId) {
      res.fail('Forbidden', 403);
      return;
    }

    const body = req.body as { address?: string | null };
    const updated = await FamilyModel.findByIdAndUpdate(
      familyId,
      { address: body.address ?? null },
      { new: true }
    ).lean();

    res.success(updated);
  },

  async listMembers(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const familyId = req.params.id;
    if (!(await canAccessFamily(familyId, userId))) {
      res.fail('Forbidden', 403);
      return;
    }

    const members = await FamilyMemberModel.find({ family_id: familyId }).lean();
    res.success(members);
  },

  async addMember(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const familyId = req.params.id;
    const family = await FamilyModel.findById(familyId).lean();
    if (!family) {
      res.fail('Family not found', 404);
      return;
    }

    const isCreator = family.created_by === userId;
    const role = await getMemberRole(familyId, userId);
    if (!isCreator && role !== 'admin') {
      res.fail('Forbidden', 403);
      return;
    }

    const body = req.body as {
      user_id?: string;
      role?: string;
      relation?: string | null;
      invitation_email?: string | null;
    };

    if (!body.user_id && !body.invitation_email) {
      res.fail('user_id or invitation_email is required', 400);
      return;
    }

    const memberUserId = body.user_id ?? uuidv4();
    const status = body.invitation_email ? 'pending' : 'active';

    const existing = await FamilyMemberModel.findOne({
      family_id: familyId,
      user_id: memberUserId,
    }).lean();
    if (existing) {
      res.fail('Member already exists', 409);
      return;
    }

    const member = await FamilyMemberModel.create({
      _id: uuidv4(),
      family_id: familyId,
      user_id: memberUserId,
      role: body.role ?? 'member',
      relation: body.relation ?? null,
      status,
      invitation_email: body.invitation_email ?? null,
      invitation_sent_at: body.invitation_email ? new Date() : null,
      joined_at: status === 'active' ? new Date() : new Date(0),
    });

    res.success(member, 'Member invited', 201);
  },

  async updateMember(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }

    const familyId = req.params.householdId;
    const memberId = req.params.memberId;

    const family = await FamilyModel.findById(familyId).lean();
    if (!family) {
      res.fail('Family not found', 404);
      return;
    }

    const isCreator = family.created_by === userId;
    const role = await getMemberRole(familyId, userId);
    if (!isCreator && role !== 'admin') {
      res.fail('Forbidden', 403);
      return;
    }

    const target = await FamilyMemberModel.findById(memberId).lean();
    if (!target) {
      res.fail('Member not found', 404);
      return;
    }

    if (target.role === 'admin') {
      res.fail('Admin members cannot be edited', 403);
      return;
    }

    const body = req.body as { role?: string; relation?: string | null; status?: string };
    const updated = await FamilyMemberModel.findByIdAndUpdate(
      memberId,
      {
        role: body.role ?? target.role,
        relation: body.relation ?? target.relation,
        status: body.status ?? target.status,
      },
      { new: true }
    ).lean();

    res.success(updated);
  },
};
