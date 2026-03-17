import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface ICardDoc {
  _id: string;
  id?: string;
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

cardSchema.pre('validate', async function (next) {
  const placeholder = typeof this.bank_name === 'string' ? this.bank_name.trim() : '';
  if (placeholder && placeholder.toLowerCase() !== 'bank') {
    next();
    return;
  }

  try {
    const Card = this.constructor as Model<ICardDoc>;
    const last = await Card
      .findOne({
        family_id: this.family_id,
        bank_name: { $exists: true, $nin: ['', 'Bank'] },
      })
      .sort({ createdAt: -1, _id: -1 })
      .select({ bank_name: 1 })
      .lean();

    if (last?.bank_name) {
      this.bank_name = last.bank_name;
    } else if (!placeholder) {
      this.bank_name = 'Bank';
    }

    next();
  } catch (err) {
    next(err as Error);
  }
});

cardSchema.virtual('id').get(function () {
  return this._id;
});

cardSchema.plugin(mongooseLeanVirtuals);

export const CardModel: Model<ICardDoc> = mongoose.model<ICardDoc>('Card', cardSchema);
