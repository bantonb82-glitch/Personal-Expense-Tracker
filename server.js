require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Transaction = require('./models/Transaction');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));

app.get('/api/summary', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
    const result = await Transaction.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totals = { income: 0, expense: 0, transactions: 0 };
    result.forEach(r => { totals[r._id] = r.total; totals.transactions += r.count; });
    totals.balance = totals.income - totals.expense;
    res.json(totals);
  } catch (e) { res.status(500).json({ message: 'Could not calculate summary.' }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense_tracker_db';
mongoose.connect(MONGODB_URI)
  .then(() => { console.log('Connected to MongoDB'); app.listen(PORT, () => console.log(`Expense Tracker running at http://localhost:${PORT}`)); })
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
