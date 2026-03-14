import mongoose, { Schema, Model } from 'mongoose';

export interface IGroupDoc {
  _id: string;
  name: string;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const groupSchema = new Schema<IGroupDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

export const GroupModel: Model<IGroupDoc> = mongoose.model<IGroupDoc>('Group', groupSchema);
