import mongoose, { Schema, Model } from 'mongoose';

export interface IBankAccountDoc {
  _id: string;
  family_id: string;
  account_name: string;
  account_number: string | null;
  bank_name: string;
  account_type: string;
  balance: number;
  currency: string;
  created_at?: Date;
  updated_at?: Date;
}

const bankAccountSchema = new Schema<IBankAccountDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    account_name: { type: String, required: true },
    account_number: { type: String, default: null },
    bank_name: { type: String, required: true },
    account_type: { type: String, default: 'savings' },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true, id: false }
);

bankAccountSchema.index({ family_id: 1 });

export const BankAccountModel: Model<IBankAccountDoc> = mongoose.model<IBankAccountDoc>(
  'BankAccount',
  bankAccountSchema
);
