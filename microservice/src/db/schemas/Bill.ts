import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IBillDoc {
  _id: string;
  id?: string;
  family_id: string;
  bill_name: string;
  category: string;
  amount: number;
  due_date: Date;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

const billSchema = new Schema<IBillDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    bill_name: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    due_date: { type: Date, required: true },
    is_recurring: { type: Boolean, default: false },
    recurrence_pattern: { type: String, default: null },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true, id: false }
);

billSchema.index({ family_id: 1 });
billSchema.index({ due_date: 1 });
billSchema.index({ status: 1 });

billSchema.virtual('id').get(function () {
  return this._id;
});

billSchema.plugin(mongooseLeanVirtuals);

export const BillModel: Model<IBillDoc> = mongoose.model<IBillDoc>('Bill', billSchema);
