import mongoose, { Schema, Model } from 'mongoose';

export interface IFamilyMemberDoc {
  _id: string;
  family_id: string;
  user_id: string;
  role: string;
  relation: string | null;
  status: string;
  invitation_email: string | null;
  invitation_sent_at: Date | null;
  joined_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

const familyMemberSchema = new Schema<IFamilyMemberDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    user_id: { type: String, required: true, ref: 'User' },
    role: { type: String, default: 'member' },
    relation: { type: String, default: null },
    status: { type: String, default: 'active' },
    invitation_email: { type: String, default: null },
    invitation_sent_at: { type: Date, default: null },
    joined_at: { type: Date, default: Date.now },
  },
  { timestamps: true, id: false }
);

familyMemberSchema.index({ family_id: 1, user_id: 1 }, { unique: true });
familyMemberSchema.index({ family_id: 1 });
familyMemberSchema.index({ user_id: 1 });

export const FamilyMemberModel: Model<IFamilyMemberDoc> = mongoose.model<IFamilyMemberDoc>(
  'FamilyMember',
  familyMemberSchema
);
