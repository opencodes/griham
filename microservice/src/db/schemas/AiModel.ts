import mongoose, { Model, Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IAiModelDoc {
  _id: string;
  id?: string;
  family_id: string;
  created_by: string | null;
  input_text: string;
  model_used: string;
  output: Record<string, unknown> | null;
  date: Date;
  accuracy: number | null;
  status: 'parsed' | 'invalid' | 'transaction_created' | 'transaction_pending';
  parse_type: 'transaction_sms';
  transaction_id: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const aiModelSchema = new Schema<IAiModelDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    created_by: { type: String, default: null, ref: 'User' },
    input_text: { type: String, required: true, trim: true },
    model_used: { type: String, required: true, trim: true },
    output: { type: Schema.Types.Mixed, default: null },
    date: { type: Date, default: Date.now },
    accuracy: { type: Number, default: null },
    status: {
      type: String,
      required: true,
      enum: ['parsed', 'invalid', 'transaction_created', 'transaction_pending'],
    },
    parse_type: { type: String, required: true, enum: ['transaction_sms'], default: 'transaction_sms' },
    transaction_id: { type: String, default: null, ref: 'Transaction' },
  },
  { timestamps: true, id: false, collection: 'AiModel' }
);

aiModelSchema.index({ family_id: 1, date: -1 });
aiModelSchema.index({ created_by: 1, date: -1 });
aiModelSchema.index({ status: 1, date: -1 });

aiModelSchema.virtual('id').get(function () {
  return this._id;
});

aiModelSchema.plugin(mongooseLeanVirtuals);

export const AiModel: Model<IAiModelDoc> = mongoose.model<IAiModelDoc>('AiModel', aiModelSchema);
