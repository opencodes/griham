import mongoose, { Schema, Model } from 'mongoose';

export interface IRoleDoc {
  _id: string;
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

export const RoleModel: Model<IRoleDoc> = mongoose.model<IRoleDoc>('Role', roleSchema);
