import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/griham',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpirySeconds: Number(process.env.JWT_EXPIRY_SECONDS) || 86400,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  aiProvider: (process.env.AI_PROVIDER || 'huggingface') as 'huggingface' | 'openai' | 'ollama',
  huggingFaceApiKey: process.env.HUGGING_FACE_API_KEY || '',
  huggingFaceBaseUrl: process.env.HUGGING_FACE_BASE_URL || 'https://api-inference.huggingface.co/models',
  huggingFaceTextModel: process.env.HUGGING_FACE_TEXT_MODEL || 'google/flan-t5-base',
  huggingFaceZeroShotModel: process.env.HUGGING_FACE_ZERO_SHOT_MODEL || 'facebook/bart-large-mnli',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaTextModel: process.env.OLLAMA_TEXT_MODEL || 'llama3.1:8b',
  ollamaZeroShotModel: process.env.OLLAMA_ZERO_SHOT_MODEL || process.env.OLLAMA_TEXT_MODEL || 'llama3.1:8b',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiTextModel: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
  openaiZeroShotModel: process.env.OPENAI_ZERO_SHOT_MODEL || process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
  testPassword: process.env.TEST_PASS || 'member123'
} as const;

export type Config = typeof config;
