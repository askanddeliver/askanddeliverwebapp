import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { connectDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import userRoutes from './routes/users';
import clientRoutes from './routes/clients';
import projectRoutes from './routes/projects';
import taskTypeRoutes from './routes/taskTypes';
import timeEntryRoutes from './routes/timeEntries';
import reportRoutes from './routes/reports';
import projectTaskRoutes from './routes/projectTasks';
import exportRoutes from './routes/export';
import portfolioRoutes from './routes/portfolio';
import uploadRoutes from './routes/uploads';
import leadRoutes from './routes/leads';
import siteConfigRoutes from './routes/siteConfig';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/task-types', taskTypeRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/project-tasks', projectTaskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/site-config', siteConfigRoutes);

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
