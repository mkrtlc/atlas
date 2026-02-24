import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import trackingRoutes from './routes/tracking.routes';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  // Public tracking endpoints — short /t prefix, no auth
  app.use('/t', trackingRoutes);

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1', routes);
  app.use(errorHandler);

  return app;
}
