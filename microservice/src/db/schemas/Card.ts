import mongoose, { Schema, Model } from 'mongoose';

export interface ICardDoc {
  _id: string;
  family_id: string;
  card_type: 'credit' | 'debit';
  bank_name: string;
  card_name: string;
  last_four_digits: string;
  card_limit: number | null;
  billing_date: number | null;
  status: 'active' | 'inactive' | 'blocked';
  created_at?: Date;
  updated_at?: Date;
}

const cardSchema = new Schema<ICardDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    card_type: { type: String, required: true, enum: ['credit', 'debit'] },
    bank_name: { type: String, required: true },
    card_name: { type: String, required: true },
    last_four_digits: { type: String, required: true },
    card_limit: { type: Number, default: null },
    billing_date: { type: Number, default: null },
    status: { type: String, default: 'active', enum: ['active', 'inactive', 'blocked'] },
  },
  { timestamps: true, id: false }
);

cardSchema.index({ family_id: 1 });

export const CardModel: Model<ICardDoc> = mongoose.model<ICardDoc>('Card', cardSchema);
