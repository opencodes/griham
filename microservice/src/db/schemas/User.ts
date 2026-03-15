import mongoose, { Schema, Model } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export interface IUserDoc {
  _id: string;
  id?: string;
  email: string;
  password: string;
  full_name: string;
  phone: string | null;
  role: 'user' | 'admin' | 'root';
  is_active: number;
  created_at?: Date;
  updated_at?: Date;
}

const userSchema = new Schema<IUserDoc>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    full_name: { type: String, default: '' },
    phone: { type: String, default: null },
    role: { type: String, default: 'user', enum: ['user', 'admin', 'root'] },
    is_active: { type: Number, default: 1 },
  },
  { timestamps: true, id: false }
);


userSchema.virtual('id').get(function () {
  return this._id;
});

userSchema.plugin(mongooseLeanVirtuals);

export const UserModel: Model<IUserDoc> = mongoose.model<IUserDoc>('User', userSchema);