require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const requireAuth = require('./src/middleware/auth');
const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"] } } }));
app.use(express.json({ limit: '30kb' }));
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/transactions', requireAuth, require('./src/routes/transactions'));
app.use('/api/budgets', requireAuth, require('./src/routes/budgets'));
app.use('/api/summary', requireAuth, require('./src/routes/summary'));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html')));
app.use((err, _req, res, _next) => { console.error(err); if (err.name === 'ValidationError') return res.status(400).json({ message: 'Some submitted information is invalid.' }); res.status(500).json({ message: 'A server error occurred. Check the application logs.' }); });
async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Add it in the hosting environment settings.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('MongoDB connected successfully.');
  app.listen(PORT, '0.0.0.0', () => console.log(`Personal Expense Tracker listening on port ${PORT}`));
}
start().catch(error => { console.error('Application startup failed:', error.message); process.exit(1); });
