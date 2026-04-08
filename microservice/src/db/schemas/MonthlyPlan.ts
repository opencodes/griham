import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IMonthlyPlanDoc {
  _id: string;
  id?: string;
  channel_id: string;
  year_month: string; // "2026-04"
  title?: string;
  target_uploads?: number;
  target_views?: number;
  target_subscribers?: number;
  focus_topics?: string[];
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

const monthlyPlanSchema = new Schema<IMonthlyPlanDoc>(
  {
    _id: { type: String, required: true },
    channel_id: { type: String, required: true, ref: 'Channel', index: true },
    year_month: { type: String, required: true },
    title: { type: String, default: null },
    target_uploads: { type: Number, default: null },
    target_views: { type: Number, default: null },
    target_subscribers: { type: Number, default: null },
    focus_topics: [{ type: String }],
    notes: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

monthlyPlanSchema.index({ channel_id: 1, year_month: 1 }, { unique: true });
monthlyPlanSchema.virtual('id').get(function () {
  return this._id;
});

monthlyPlanSchema.plugin(mongooseLeanVirtuals);

export const MonthlyPlanModel: Model<IMonthlyPlanDoc> = mongoose.model<IMonthlyPlanDoc>(
  'MonthlyPlan',
  monthlyPlanSchema
);
