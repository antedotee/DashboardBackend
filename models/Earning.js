// Path: /Users/devanshydv/Documents/Backend/models/Earning.js
const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    royaltyEarned: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    paymentDate: Date
}, { timestamps: true });

module.exports = mongoose.model('Earning', earningSchema);