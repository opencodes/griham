import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IInsuranceDoc {
  _id: string;
  id?: string;
  family_id: string;
  type: 'life' | 'health' | 'vehicle' | 'term' | 'other';
  provider: string;
  policyName: string;
  policyNumber: string;
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'yearly';
  nextDueDate: Date | null;
  coverageAmount: number;
  insuredMembers: string[];
  status: 'active' | 'expired';
  created_at?: Date;
  updated_at?: Date;
}

const insuranceSchema = new Schema<IInsuranceDoc>({
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    type: {
        type: String,
        enum: ['life', 'health', 'vehicle', 'term', 'other'],
        default: 'other'
    },
    provider: { type: String, required: true },
    policyName: { type: String, required: true },
    policyNumber: { type: String, required: true },
    premiumAmount: { type: Number, default: 0 },
    premiumFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        default: 'yearly'
    },
    nextDueDate: { type: Date, default: null },
    coverageAmount: { type: Number, default: 0 },
    insuredMembers: { type: [String], default: [] },
    status: {
        type: String,
        enum: ['active', 'expired'],
        default: 'active'
    }
}, { timestamps: true, id: false, collection: 'fin_insurance' });

insuranceSchema.index({ family_id: 1 });
insuranceSchema.index({ nextDueDate: 1 });
insuranceSchema.index({ status: 1 });
insuranceSchema.virtual('id').get(function () {
    return this._id;
});

insuranceSchema.plugin(mongooseLeanVirtuals);

export const InsuranceModel: Model<IInsuranceDoc> = mongoose.model<IInsuranceDoc>('fin_insurance', insuranceSchema);
