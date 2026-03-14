import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/griham',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpirySeconds: Number(process.env.JWT_EXPIRY_SECONDS) || 86400,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  huggingFaceApiKey: process.env.HUGGING_FACE_API_KEY || '',
} as const;

export type Config = typeof config;
