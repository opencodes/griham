import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IPermissionDoc {
  _id: string;
  id?: string;
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

permissionSchema.virtual('id').get(function () {
  return this._id;
});

permissionSchema.plugin(mongooseLeanVirtuals);

export const PermissionModel: Model<IPermissionDoc> = mongoose.model<IPermissionDoc>(
  'Permission',
  permissionSchema
);
