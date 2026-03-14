import mongoose, { Schema, Model } from 'mongoose';

export interface IGroupRoleDoc {
  group_id: string;
  role_id: string;
  created_at?: Date;
}

const groupRoleSchema = new Schema<IGroupRoleDoc>(
  {
    group_id: { type: String, required: true, ref: 'Group' },
    role_id: { type: String, required: true, ref: 'Role' },
  },
  { timestamps: true }
);

groupRoleSchema.index({ group_id: 1, role_id: 1 }, { unique: true });

export const GroupRoleModel: Model<IGroupRoleDoc> = mongoose.model<IGroupRoleDoc>(
  'GroupRole',
  groupRoleSchema
);
