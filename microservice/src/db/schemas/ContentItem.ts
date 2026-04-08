import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IContentItemDoc {
  _id: string;
  id?: string;
  channel_id: string;
  episode_number: number;
  title: string;
  description?: string;
  status: 'plan' | 'build' | 'publish';
  planned_month?: string; // "2026-04"
  planned_publish_date?: Date;
  planned_date?: Date;
  start_build_date?: Date;
  published_date?: Date;
  video_length_seconds?: number;
  tags?: string[];
  notes?: string;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

const contentItemSchema = new Schema<IContentItemDoc>(
  {
    _id: { type: String, required: true },
    channel_id: { type: String, required: true, ref: 'Channel', index: true },
    episode_number: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ['plan', 'build', 'publish'],
      default: 'plan',
      required: true,
    },
    planned_month: { type: String, default: null, index: true },
    planned_publish_date: { type: Date, default: null },
    planned_date: { type: Date, default: null },
    start_build_date: { type: Date, default: null },
    published_date: { type: Date, default: null },
    video_length_seconds: { type: Number, default: null },
    tags: [{ type: String }],
    notes: { type: String, default: null },
    created_by: { type: String, required: true, ref: 'User' },
  },
  { timestamps: true, id: false }
);

// Create unique index for channel_id + episode_number
contentItemSchema.index({ channel_id: 1, episode_number: 1 }, { unique: true });

contentItemSchema.virtual('id').get(function () {
  return this._id;
});

contentItemSchema.plugin(mongooseLeanVirtuals);
export const ContentItemModel: Model<IContentItemDoc> = mongoose.model<IContentItemDoc>(
  'ContentItem',
  contentItemSchema
);
