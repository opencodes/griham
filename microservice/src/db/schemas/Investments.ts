import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IInvestmentSchema {
    _id: string;
    id?: string;
    family_id: string;
    type: string;
    name: string;
    folioNumber: string;
    sipAmount: number;
    sipDay: number;
    startDate: Date;
    currentValue: number;
    investedAmount: number;
    units: number;
    nav: number;
    platform: string | null;
    status: 'active' | 'paused' | 'closed';
    created_at?: Date;
    updated_at?: Date;
}

const investmentSchema = new Schema<IInvestmentSchema>(
    {
        _id: { type: String, required: true },
        family_id: { type: String, required: true, ref: 'Family' },
        type: {
            type: String,
            enum: ['mutual_fund', 'stock', 'fd', 'other'],
            default: 'mutual_fund'
        },
        name: { type: String, required: true },
        folioNumber: { type: String, required: true },
        sipAmount: { type: Number, required: true },
        sipDay: { type: Number, required: true },
        startDate: { type: Date, required: true },
        currentValue: { type: Number, required: true },
        investedAmount: { type: Number, required: true },
        units: { type: Number, required: true },
        nav: { type: Number, required: true },
        platform: { type: String, default: null },
        status: {
            type: String,
            enum: ['active', 'paused', 'closed'],
            default: 'active'
        }
    },
    { timestamps: true, id: false, collection: 'fin_investment' }
);

investmentSchema.index({ family_id: 1 });
investmentSchema.index({ startDate: 1 });
investmentSchema.index({ status: 1 });
investmentSchema.virtual('id').get(function () {
    return this._id;
});

investmentSchema.plugin(mongooseLeanVirtuals);

export const InvestmentModel: Model<IInvestmentSchema> = mongoose.model<IInvestmentSchema>('fin_investment', investmentSchema);
