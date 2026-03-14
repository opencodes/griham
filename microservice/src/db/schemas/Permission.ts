import mongoose, { Schema, Model } from 'mongoose';

export interface IPermissionDoc {
  _id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const permissionSchema = new Schema<IPermissionDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    resource: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

export const PermissionModel: Model<IPermissionDoc> = mongoose.model<IPermissionDoc>(
  'Permission',
  permissionSchema
);
