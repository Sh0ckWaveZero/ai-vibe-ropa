import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import rolesRoutes from './modules/roles/roles.routes.js';
import departmentsRoutes from './modules/departments/departments.routes.js';
import ropaRoutes from './modules/ropa/ropa.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/roles', rolesRoutes);
  app.use('/api/departments', departmentsRoutes);
  app.use('/api/ropa', ropaRoutes);
  app.use('/api/audit', auditRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
