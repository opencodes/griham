import mongoose, { Model, Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IContactDoc {
  _id: string;
  id?: string;

  family_id: string;
  user_id: string;
  device_id: string | null;

  name: string | null;
  phone: string | null;
  phone_ext: string | null;
  phone_number: string | null;
  email: string | null;

  phone_norm: string | null;
  email_norm: string | null;

  last_synced_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

const contactSchema = new Schema<IContactDoc>(
  {
    _id: { type: String, required: true },

    family_id: { type: String, required: true, ref: 'Family' },
    user_id: { type: String, required: true, ref: 'User' },
    device_id: { type: String, default: null },

    name: { type: String, default: null },
    phone: { type: String, default: null },
    phone_ext: { type: String, default: null },
    phone_number: { type: String, default: null },
    email: { type: String, default: null },

    phone_norm: { type: String, default: null },
    email_norm: { type: String, default: null },

    last_synced_at: { type: Date, default: () => new Date() },
  },
  { timestamps: true, id: false }
);

contactSchema.virtual('id').get(function () {
  return this._id;
});

// De-dupe within a family.
// Unique sparse indexes allow nulls while preventing duplicates on actual values.
contactSchema.index({ family_id: 1, phone_number: 1 }, { unique: true, sparse: true });
contactSchema.index({ family_id: 1, email_norm: 1 }, { unique: true, sparse: true });

contactSchema.plugin(mongooseLeanVirtuals);

export const ContactModel: Model<IContactDoc> = mongoose.model<IContactDoc>('Contact', contactSchema);

