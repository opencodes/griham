import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export type AssetType = 'property' | 'vehicle' | 'gadget' | 'document';

export interface IAssetDoc {
  _id: string;
  id?: string;
  family_id: string;
  asset_type: AssetType;
  name: string;
  description: string | null;
  purchase_date: Date | null;
  purchase_price: number;
  current_value: number;
  location: string | null;
  expiry_date: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

const assetSchema = new Schema<IAssetDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    asset_type: {
      type: String,
      required: true,
      enum: ['property', 'vehicle', 'gadget', 'document'],
    },
    name: { type: String, required: true },
    description: { type: String, default: null },
    purchase_date: { type: Date, default: null },
    purchase_price: { type: Number, default: 0 },
    current_value: { type: Number, default: 0 },
    location: { type: String, default: null },
    expiry_date: { type: Date, default: null },
  },
  { timestamps: true, id: false }
);

assetSchema.index({ family_id: 1, asset_type: 1 });
assetSchema.index({ family_id: 1, expiry_date: 1 });

assetSchema.virtual('id').get(function () {
  return this._id;
});

assetSchema.plugin(mongooseLeanVirtuals);

export const AssetModel: Model<IAssetDoc> = mongoose.model<IAssetDoc>('Asset', assetSchema);
