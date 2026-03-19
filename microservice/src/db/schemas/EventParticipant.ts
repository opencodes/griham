import mongoose, { Model, Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export type EventParticipantRole = 'guest' | 'vendor' | 'host';
export type EventParticipantRsvpStatus = 'pending' | 'accepted' | 'declined';

export interface IEventParticipantDoc {
  _id: string;
  id?: string;
  event_id: string;
  contact_id: string;
  role: EventParticipantRole;
  rsvp_status: EventParticipantRsvpStatus;
  created_at?: Date;
  updated_at?: Date;
}

const eventParticipantSchema = new Schema<IEventParticipantDoc>(
  {
    _id: { type: String, required: true },
    event_id: { type: String, required: true, ref: 'Event' },
    contact_id: { type: String, required: true, ref: 'Contact' },
    role: {
      type: String,
      required: true,
      enum: ['guest', 'vendor', 'host'],
      default: 'guest',
    },
    rsvp_status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  { timestamps: true, id: false }
);

eventParticipantSchema.virtual('id').get(function () {
  return this._id;
});

eventParticipantSchema.index({ event_id: 1, role: 1 });
eventParticipantSchema.index({ event_id: 1, contact_id: 1 }, { unique: true });

eventParticipantSchema.plugin(mongooseLeanVirtuals);

export const EventParticipantModel: Model<IEventParticipantDoc> = mongoose.model<IEventParticipantDoc>(
  'EventParticipant',
  eventParticipantSchema
);
