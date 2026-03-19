import mongoose, { Model, Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';


export interface ILoanSchema {
    _id: string;
    id?: string;
    family_id: string;
    name: string;
    lender: string;
    principalAmount: number;
    interestRate: number; // annual %
    tenureMonths: number;

    emiAmount: number;
    startDate: Date | null;
    nextDueDate: Date | null;
    outstandingPrincipal: number;
    type: string;
    status: 'active' | 'closed';
    created_at?: Date;
    updated_at?: Date;
}

const loanSchema = new Schema<ILoanSchema>({
  _id: { type: String, required: true },
  family_id: { type: String, required: true, ref: 'Family' },

  name: { type: String, required: true },
  lender: { type: String, required: true },

  principalAmount: { type: Number, default: 0 },
  interestRate: { type: Number, default: 0 },
  tenureMonths: { type: Number, default: 0 },

  emiAmount: { type: Number, default: 0 },
  startDate: { type: Date, default: null },
  nextDueDate: { type: Date, default: null },

  outstandingPrincipal: { type: Number, default: 0 },

  type: {
    type: String,
    enum: ['home', 'car', 'personal', 'education', 'other'],
    default: 'other'
  },

  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  }
}, { timestamps: true, id: false, collection: 'fin_loans' });


loanSchema.index({ family_id: 1 });
loanSchema.index({ nextDueDate: 1 });
loanSchema.index({ status: 1 });
loanSchema.virtual('id').get(function () {
    return this._id;
});

loanSchema.plugin(mongooseLeanVirtuals);

export const LoanModel: Model<ILoanSchema> = mongoose.model<ILoanSchema>('fin_loan', loanSchema);
