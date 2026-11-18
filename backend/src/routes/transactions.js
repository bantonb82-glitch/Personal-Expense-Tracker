const router = require('express').Router();
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
function validId(id) { return mongoose.Types.ObjectId.isValid(id); }
function clean(body) {
  const data = { title: String(body.title || '').trim(), amount: Number(body.amount), type: body.type, category: String(body.category || '').trim(), date: body.date, paymentMethod: body.paymentMethod || 'Cash', notes: String(body.notes || '').trim() };
  if (!data.title || data.title.length > 100) throw new Error('Enter a transaction title (up to 100 characters).');
  if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error('Amount must be greater than zero.');
  if (!['income', 'expense'].includes(data.type)) throw new Error('Choose Income or Expense.');
  if (!data.category || data.category.length > 50) throw new Error('Choose a valid category.');
  if (!data.date || Number.isNaN(new Date(data.date).getTime())) throw new Error('Choose a valid date.');
  if (!['Cash', 'Mobile Money', 'Bank', 'Card', 'Other'].includes(data.paymentMethod)) throw new Error('Choose a valid payment method.');
  if (data.notes.length > 500) throw new Error('Notes must be 500 characters or fewer.');
  return data;
}
router.get('/', async (req, res, next) => {
  try {
    const q = { userId: req.userId };
    if (req.query.type && ['income', 'expense'].includes(req.query.type)) q.type = req.query.type;
    if (req.query.category) q.category = String(req.query.category).slice(0, 50);
    if (req.query.from || req.query.to) { q.date = {}; if (req.query.from) q.date.$gte = new Date(req.query.from); if (req.query.to) { const to = new Date(req.query.to); to.setHours(23,59,59,999); q.date.$lte = to; } }
    const search = String(req.query.search || '').trim().slice(0, 80);
    if (search) q.$or = [{ title: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { category: { $regex: search, $options: 'i' } }, { notes: { $regex: search, $options: 'i' } }];
    const items = await Transaction.find(q).sort({ date: -1, createdAt: -1 }).limit(500);
    res.json(items);
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try { if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid transaction ID.' }); const item = await Transaction.findOne({ _id: req.params.id, userId: req.userId }); if (!item) return res.status(404).json({ message: 'Transaction not found.' }); res.json(item); }
  catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  try { let data; try { data = clean(req.body); } catch (e) { return res.status(400).json({ message: e.message }); } const item = await Transaction.create({ ...data, userId: req.userId }); res.status(201).json(item); }
  catch (error) { next(error); }
});
router.put('/:id', async (req, res, next) => {
  try { if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid transaction ID.' }); let data; try { data = clean(req.body); } catch (e) { return res.status(400).json({ message: e.message }); } const item = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, data, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Transaction not found.' }); res.json(item); }
  catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
  try { if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid transaction ID.' }); const item = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId }); if (!item) return res.status(404).json({ message: 'Transaction not found.' }); res.json({ message: 'Transaction deleted.' }); }
  catch (error) { next(error); }
});
module.exports = router;
                                                                  
