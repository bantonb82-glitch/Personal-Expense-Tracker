const express = require('express');
const Transaction = require('../models/Transaction');
const router = express.Router();

// READ all transactions (optional filters: type, category, month)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (['income', 'expense'].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)) {
      const start = new Date(`${req.query.month}-01T00:00:00.000Z`);
      const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
      filter.date = { $gte: start, $lt: end };
    }
    const rows = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Could not load transactions.' }); }
});

// CREATE a transaction
router.post('/', async (req, res) => {
  try {
    const transaction = await Transaction.create(req.body);
    res.status(201).json(transaction);
  } catch (e) { res.status(400).json({ message: e.message || 'Invalid transaction.' }); }
});

// UPDATE a transaction
router.put('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    res.json(transaction);
  } catch (e) { res.status(400).json({ message: e.message || 'Could not update transaction.' }); }
});

// DELETE a transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ message: 'Transaction deleted successfully.' });
  } catch (e) { res.status(400).json({ message: 'Invalid transaction ID.' }); }
});

module.exports = router;
