import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IRoleDoc {
  _id: string;
  id?: string;
  name: string;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const roleSchema = new Schema<IRoleDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

roleSchema.virtual('id').get(function () {
  return this._id;
});

roleSchema.plugin(mongooseLeanVirtuals);
export const RoleModel: Model<IRoleDoc> = mongoose.model<IRoleDoc>('Role', roleSchema);
