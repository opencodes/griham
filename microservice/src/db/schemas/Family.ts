import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IFamilyDoc {
  _id: string;
  id?: string;
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

familySchema.virtual('id').get(function () {
  return this._id;
});

familySchema.plugin(mongooseLeanVirtuals);
export const FamilyModel: Model<IFamilyDoc> = mongoose.model<IFamilyDoc>('Family', familySchema);
