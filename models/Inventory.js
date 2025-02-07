// Path: /Users/devanshydv/Documents/Backend/models/Inventory.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantityTotal: { type: Number, required: true },
    quantityAvailable: { type: Number, required: true },
    transactions: [{
        type: { type: String, enum: ['addition', 'sale', 'complimentary'], required: true },
        quantity: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        notes: String
    }],
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);