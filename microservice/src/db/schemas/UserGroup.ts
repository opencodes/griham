import mongoose, { Schema, Model } from 'mongoose';

export interface IUserGroupDoc {
  user_id: string;
  group_id: string;
  created_at?: Date;
}

const userGroupSchema = new Schema<IUserGroupDoc>(
  {
    user_id: { type: String, required: true, ref: 'User' },
    group_id: { type: String, required: true, ref: 'Group' },
  },
  { timestamps: true }
);

userGroupSchema.index({ user_id: 1, group_id: 1 }, { unique: true });

export const UserGroupModel: Model<IUserGroupDoc> = mongoose.model<IUserGroupDoc>(
  'UserGroup',
  userGroupSchema
);
