import mongoose from 'mongoose';
import { config } from '../../config/index.js';

export async function connectMongo(): Promise<void> {
  console.log(config.mongodbUri)
  await mongoose.connect(config.mongodbUri);
}

export function getConnection(): mongoose.Connection {
  return mongoose.connection;
}
