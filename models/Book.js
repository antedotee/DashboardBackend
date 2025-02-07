// Path: /Users/devanshdv/Documents/Backend/models/Book.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    language: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
    price: { type: Number, required: true },
    genre: { type: String, required: true },
    isbn: { type: String, required: true, unique: true },
    pages: { type: Number, required: true },
    coverType: { type: String, required: true },
    publishingDetails: {
        edition: { type: Date, required: true },
        quantity: { type: Number, required: true },
        mrp: { type: Number, required: true },
        royaltyPercentage: { type: Number, required: true },
        soldCopies: { type: Number, default: 0 },
        royaltyEarned: { type: Number, default: 0 }
    },
    authorsPurchase: [{
        date: { type: Date, required: true },
        particulars: String,
        quantity: Number,
        mrp: Number,
        discount: Number,
        total: Number,
        paymentStatus: { type: String, enum: ['Paid', 'Pending'] }
    }]
});

module.exports = mongoose.model('Book', bookSchema);