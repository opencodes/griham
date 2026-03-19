import mongoose, { Model, Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export type EventType = 'marriage' | 'anniversary' | 'birthday' | 'other';
export type EventStatus = 'planned' | 'ongoing' | 'completed';

export interface IEventDoc {
  _id: string;
  id?: string;
  family_id: string;
  name: string;
  type: EventType;
  start_date: Date;
  end_date: Date | null;
  location: string | null;
  total_budget: number;
  notes: string | null;
  status: EventStatus;
  created_at?: Date;
  updated_at?: Date;
}

const eventSchema = new Schema<IEventDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['marriage', 'anniversary', 'birthday', 'other'],
      default: 'other',
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date, default: null },
    location: { type: String, default: null },
    total_budget: { type: Number, default: 0 },
    notes: { type: String, default: null },
    status: {
      type: String,
      required: true,
      enum: ['planned', 'ongoing', 'completed'],
      default: 'planned',
    },
  },
  { timestamps: true, id: false }
);

eventSchema.virtual('id').get(function () {
  return this._id;
});

eventSchema.index({ family_id: 1, start_date: -1 });
eventSchema.index({ family_id: 1, status: 1 });

eventSchema.plugin(mongooseLeanVirtuals);

export const EventModel: Model<IEventDoc> = mongoose.model<IEventDoc>('Event', eventSchema);
