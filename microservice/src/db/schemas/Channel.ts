import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IChannelDoc {
  _id: string;
  id?: string;
  user_id: string;
  name: string;
  youtube_url?: string;
  description?: string;
  upload_schedule?: string;
  target_monthly_uploads?: number;
  monthly_target_views?: number;
  color_tag?: string;
  created_at?: Date;
  updated_at?: Date;
}

const channelSchema = new Schema<IChannelDoc>(
  {
    _id: { type: String, required: true },
    user_id: { type: String, required: true, ref: 'User', index: true },
    name: { type: String, required: true },
    youtube_url: { type: String, default: null },
    description: { type: String, default: null },
    upload_schedule: { type: String, default: 'Mon, Wed, Fri at 8:00 AM' },
    target_monthly_uploads: { type: Number, default: 8 },
    monthly_target_views: { type: Number, default: 5000 },
    color_tag: { type: String, default: 'blue' },
  },
  { timestamps: true, id: false }
);

channelSchema.virtual('id').get(function () {
  return this._id;
});

channelSchema.plugin(mongooseLeanVirtuals);

export const ChannelModel: Model<IChannelDoc> = mongoose.model<IChannelDoc>(
  'Channel',
  channelSchema
);
