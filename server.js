import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './backend/routes/auth.js';
import userRoutes from './backend/routes/user.js';
import marketplaceRoutes from './backend/routes/marketplace.js';
import shopRoutes from './backend/routes/shop.js';
import qaRoutes from './backend/routes/qa.js';
import reportRoutes from './backend/routes/report.js';
import { initDatabase } from './backend/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ✅ Railway requires dynamic port
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
  next();
});

// Initialize Database
try {
  initDatabase();
} catch (error) {
  console.error("Failed to initialize database:", error);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/listings', marketplaceRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/report', reportRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Listen on all interfaces (important for Railway)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ┌──────────────────────────────────────────────────┐
  │  Blake Association Server Running                │
  │  Port: ${PORT}
  └──────────────────────────────────────────────────┘
  `);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
});
