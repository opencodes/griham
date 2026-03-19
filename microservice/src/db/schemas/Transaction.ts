import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface ITransactionDoc {
  _id: string;
  id?: string;
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
  event_id: string | null;
  sub_event_id: string | null;
  source_type: string | null;
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
    event_id: { type: String, default: null, ref: 'Event' },
    sub_event_id: { type: String, default: null, ref: 'SubEvent' },
    source_type: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

transactionSchema.index({ family_id: 1 });
transactionSchema.index({ transaction_date: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ event_id: 1, transaction_date: -1 });
transactionSchema.index({ sub_event_id: 1, transaction_date: -1 });
transactionSchema.index({ source_type: 1 });


transactionSchema.virtual('id').get(function () {
  return this._id;
});

transactionSchema.plugin(mongooseLeanVirtuals);

export const TransactionModel: Model<ITransactionDoc> = mongoose.model<ITransactionDoc>(
  'Transaction',
  transactionSchema
);
