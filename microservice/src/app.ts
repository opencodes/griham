import express, { Express } from 'express';
import cors from 'cors';
import { config } from '../config/index.js';
import { responseMiddleware } from './shared/middleware/response.js';
import { authRoutes } from './modules/auth/routes.js';
import { financeRoutes } from './modules/finance/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { familiesRoutes } from './modules/families/routes.js';
import { contactsRoutes } from './modules/contacts/routes.js';
import { assetsRoutes } from './modules/assets/routes.js';
import { eventsRoutes } from './modules/events/routes.js';
import { contentTrackerRoutes } from './modules/content-tracker/routes.js';
import { channelsRoutes } from './modules/channels/routes.js';
import morgan from 'morgan';

const app: Express = express();

morgan.token("body", (req) => {
  return JSON.stringify((req as any).body);
});
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(responseMiddleware);
app.use(morgan('dev'));

app.use('/api', authRoutes);
app.use('/api', familiesRoutes);
app.use('/api', contactsRoutes);
app.use('/api', contentTrackerRoutes);
app.use('/api', channelsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/admin', adminRoutes);

export default app;
