// Path: /Users/devanshydv/Documents/Backend/models/Sale.js
const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true },
    amount: { type: Number, required: true },
    royaltyEarned: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);