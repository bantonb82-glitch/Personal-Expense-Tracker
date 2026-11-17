const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  category: { type: String, required: true, trim: true },
  limit: { type: Number, required: true, min: 0.01 },
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }
}, { timestamps: true });

budgetSchema.index({ category: 1, month: 1 }, { unique: true });
module.exports = mongoose.model('Budget', budgetSchema);
