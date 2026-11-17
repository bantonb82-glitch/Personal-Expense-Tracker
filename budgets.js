const express = require('express');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const budgets = await Budget.find({ month }).sort({ category: 1 });
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
    const spending = await Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', spent: { $sum: '$amount' } } }
    ]);
    const spentMap = Object.fromEntries(spending.map(x => [x._id, x.spent]));
    res.json(budgets.map(b => ({ ...b.toObject(), spent: spentMap[b.category] || 0, remaining: b.limit - (spentMap[b.category] || 0) })));
  } catch (e) { res.status(500).json({ message: 'Could not load budgets.' }); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json(await Budget.create(req.body)); }
  catch (e) { res.status(400).json({ message: e.code === 11000 ? 'A budget already exists for this category and month.' : (e.message || 'Invalid budget.') }); }
});

router.put('/:id', async (req, res) => {
  try {
    const budget = await Budget.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!budget) return res.status(404).json({ message: 'Budget not found.' });
    res.json(budget);
  } catch (e) { res.status(400).json({ message: e.message || 'Could not update budget.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Budget not found.' });
    res.json({ message: 'Budget deleted successfully.' });
  } catch (e) { res.status(400).json({ message: 'Invalid budget ID.' }); }
});

module.exports = router;
