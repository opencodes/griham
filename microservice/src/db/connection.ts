import mongoose from 'mongoose';
import { config } from '../../config/index.js';
import { ContactModel } from './schemas/Contact.js';

export async function connectMongo(): Promise<void> {
  await mongoose.connect(config.mongodbUri);
  // Keep DB indexes aligned with schema (drops obsolete ones).
  await ContactModel.syncIndexes();
}

export function getConnection(): mongoose.Connection {
  return mongoose.connection;
}
