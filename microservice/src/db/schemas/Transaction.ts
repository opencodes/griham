import mongoose, { Schema, Model } from 'mongoose';

export interface ITransactionDoc {
  _id: string;
  family_id: string;
  account_id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string | null;
  transaction_date: Date;
  created_by: string;
  currency: string | null;
  merchant_name: string | null;
  payment_method: string | null;
  bank_name: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const transactionSchema = new Schema<ITransactionDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    account_id: { type: String, required: true, ref: 'BankAccount' },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: null },
    transaction_date: { type: Date, required: true },
    created_by: { type: String, required: true, ref: 'User' },
    currency: { type: String, default: null },
    merchant_name: { type: String, default: null },
    payment_method: { type: String, default: null },
    bank_name: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

transactionSchema.index({ family_id: 1 });
transactionSchema.index({ transaction_date: 1 });
transactionSchema.index({ type: 1 });

export const TransactionModel: Model<ITransactionDoc> = mongoose.model<ITransactionDoc>(
  'Transaction',
  transactionSchema
);
