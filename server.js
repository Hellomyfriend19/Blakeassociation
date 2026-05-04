import express from 'express';
import cors from 'cors';
import authRoutes from './backend/routes/auth.js';
import userRoutes from './backend/routes/user.js';
import marketplaceRoutes from './backend/routes/marketplace.js';
import shopRoutes from './backend/routes/shop.js';
import qaRoutes from './backend/routes/qa.js';
import reportRoutes from './backend/routes/report.js';
import { initDatabase } from './backend/database.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'https://blakeassociation.vercel.app',
    'http://localhost:5173'
  ]
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
  next();
});

try {
  initDatabase();
} catch (error) {
  console.error("Failed to initialize database:", error);
}

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/listings', marketplaceRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/report', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
