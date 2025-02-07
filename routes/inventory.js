// Path: /Users/devanshydv/Documents/Backend/routes/inventory.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const Book = require('../models/Book');
const mongoose = require('mongoose');
router.post('/update', auth, async (req, res) => {
    try {
        const { bookId, quantity, type, notes } = req.body;
        
        let inventory = await Inventory.findOne({ book: bookId });
        if (!inventory) {
            inventory = new Inventory({
                book: bookId,
                author: req.user.userId,
                quantityTotal: 0,
                quantityAvailable: 0,
                transactions: []
            });
        }

        if (type === 'addition') {
            inventory.quantityTotal += quantity;
            inventory.quantityAvailable += quantity;
        } else if (type === 'sale' || type === 'complimentary') {
            inventory.quantityAvailable -= quantity;
        }

        inventory.transactions.push({
            type,
            quantity,
            notes,
            date: new Date()
        });

        inventory.lastUpdated = new Date();
        await inventory.save();

        res.json(inventory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get inventory status for a specific book
router.get('/status/:bookId', auth, async (req, res) => {
    try {
        const { bookId } = req.params;
        const authorId = req.user.userId;

        // Get book details first
        const book = await Book.findOne({
            _id: new mongoose.Types.ObjectId(bookId),
            author: new mongoose.Types.ObjectId(authorId)
        });

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // Get inventory details
        const inventory = await Inventory.findOne({
            book: new mongoose.Types.ObjectId(bookId),
            author: new mongoose.Types.ObjectId(authorId)
        }).populate('book', 'title price');

        if (!inventory) {
            // Create initial inventory if it doesn't exist
            const newInventory = new Inventory({
                book: bookId,
                author: authorId,
                quantityTotal: book.publishingDetails.quantity,
                quantityAvailable: book.publishingDetails.quantity - book.publishingDetails.soldCopies,
                transactions: [{
                    type: 'addition',
                    quantity: book.publishingDetails.quantity,
                    date: new Date(),
                    notes: 'Initial stock'
                }]
            });

            await newInventory.save();
            await newInventory.populate('book', 'title price');
            return res.json(newInventory);
        }

        res.json(inventory);
    } catch (error) {
        console.error('Inventory status error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;