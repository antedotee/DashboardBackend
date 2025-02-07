// Path: /Users/devanshdv/Documents/Backend/routes/book.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Book = require('../models/Book');

// Create book
router.post('/', auth, roleCheck(['author']), async (req, res) => {
    try {
        const bookData = {
            ...req.body,
            author: req.user.userId  // Add this line to set the author
        };
        
        const book = new Book(bookData);
        await book.save();
        
        res.status(201).json(book);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update book
router.put('/:bookId', auth, roleCheck(['author']), async (req, res) => {
    try {
        const Book = require('../models/Book');
        const book = await Book.findByIdAndUpdate(
            req.params.bookId,
            { $set: req.body },
            { new: true }
        );
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        res.json(book);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;