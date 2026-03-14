import mongoose, { Schema, Model } from 'mongoose';

export interface IFamilyDoc {
  _id: string;
  name: string;
  address: string | null;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

const familySchema = new Schema<IFamilyDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String, default: null },
    created_by: { type: String, required: true, ref: 'User' },
  },
  { timestamps: true, id: false }
);

export const FamilyModel: Model<IFamilyDoc> = mongoose.model<IFamilyDoc>('Family', familySchema);
