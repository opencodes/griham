/**
 * Griham microservice entry point.
 * Build: npm run build  →  Start: npm start
 * Dev:   npm run dev     (tsx watch)
 */
import { config } from '../config/index.js';
import { connectMongo } from './db/connection.js';
import app from './app.js';

async function main(): Promise<void> {
  await connectMongo();
  app.listen(config.port, () => {
    console.log(`Griham API listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
