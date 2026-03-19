import mongoose, { Model, Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface ISubEventDoc {
  _id: string;
  id?: string;
  event_id: string;
  name: string;
  date_time: Date;
  location: string | null;
  budget: number;
  created_at?: Date;
  updated_at?: Date;
}

const subEventSchema = new Schema<ISubEventDoc>(
  {
    _id: { type: String, required: true },
    event_id: { type: String, required: true, ref: 'Event' },
    name: { type: String, required: true, trim: true },
    date_time: { type: Date, required: true },
    location: { type: String, default: null },
    budget: { type: Number, default: 0 },
  },
  { timestamps: true, id: false }
);

subEventSchema.virtual('id').get(function () {
  return this._id;
});

subEventSchema.index({ event_id: 1, date_time: 1 });

subEventSchema.plugin(mongooseLeanVirtuals);

export const SubEventModel: Model<ISubEventDoc> = mongoose.model<ISubEventDoc>('SubEvent', subEventSchema);
