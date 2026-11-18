const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
function issueToken(user) {
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
router.post('/register', authLimit, async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (fullName.length < 2 || fullName.length > 80) return res.status(400).json({ message: 'Enter your full name (2–80 characters).' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, passwordHash });
    return res.status(201).json({ token: issueToken(user), user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' }); next(error); }
});
router.post('/login', authLimit, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    return res.json({ token: issueToken(user), user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (error) { next(error); }
});
router.post('/logout', (_req, res) => res.json({ message: 'Signed out.' }));
router.get('/me', requireAuth, async (req, res, next) => {
  try { const user = await User.findById(req.userId).select('fullName email'); if (!user) return res.status(404).json({ message: 'Account not found.' }); res.json({ user }); }
  catch (error) { next(error); }
});
module.exports = router;
                             
