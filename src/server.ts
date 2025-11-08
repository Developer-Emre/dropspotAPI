import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import dropRoutes from './routes/drops';
import waitlistRoutes from './routes/waitlist';
import claimRoutes from './routes/claim';
import userRoutes from './routes/user';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { SeedGenerator } from './utils/seedGenerator';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DropSpot API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/drops', dropRoutes);
app.use('/drops', waitlistRoutes);
app.use('/drops', claimRoutes);
app.use('/', claimRoutes); // For /my-claims endpoint
app.use('/', userRoutes); // For /my-waitlists endpoint

// 404 handler for undefined routes
app.use('*', notFoundHandler);

// Global error handler (must be last middleware)
app.use(globalErrorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 DropSpot API server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Initialize seed generator
  try {
    const seedGenerator = SeedGenerator.getInstance();
    const seedData = seedGenerator.generateSeed();
    console.log(`🌱 Seed initialized: ${seedData.seed}`);
  } catch (error) {
    console.error('❌ Failed to initialize seed generator:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;