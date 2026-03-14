import mongoose, { Schema, Model } from 'mongoose';

export interface IUserRoleDoc {
  user_id: string;
  role_id: string;
  created_at?: Date;
}

const userRoleSchema = new Schema<IUserRoleDoc>(
  {
    user_id: { type: String, required: true, ref: 'User' },
    role_id: { type: String, required: true, ref: 'Role' },
  },
  { timestamps: true }
);

userRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });

export const UserRoleModel: Model<IUserRoleDoc> = mongoose.model<IUserRoleDoc>(
  'UserRole',
  userRoleSchema
);
