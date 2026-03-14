import mongoose, { Schema, Model } from 'mongoose';

export interface IRolePermissionDoc {
  role_id: string;
  permission_id: string;
  created_at?: Date;
}

const rolePermissionSchema = new Schema<IRolePermissionDoc>(
  {
    role_id: { type: String, required: true, ref: 'Role' },
    permission_id: { type: String, required: true, ref: 'Permission' },
  },
  { timestamps: true }
);

rolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

export const RolePermissionModel: Model<IRolePermissionDoc> = mongoose.model<IRolePermissionDoc>(
  'RolePermission',
  rolePermissionSchema
);
