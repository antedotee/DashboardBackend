const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Author = require('../models/Author');
const Book = require('../models/Book');
const Sale = require('../models/Sale');

// Admin middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Get all authors with their stats
router.get('/authors', auth, isAdmin, async (req, res) => {
    try {
        const authors = await Author.find().select('-password');
        const authorStats = await Promise.all(authors.map(async (author) => {
            const books = await Book.countDocuments({ author: author._id });
            const sales = await Sale.aggregate([
                { $match: { author: author._id } },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$quantity' },
                        totalRevenue: { $sum: '$amount' },
                        totalRoyalty: { $sum: '$royaltyEarned' }
                    }
                }
            ]);

            return {
                ...author.toObject(),
                statistics: {
                    totalBooks: books,
                    totalSales: sales[0]?.totalSales || 0,
                    totalRevenue: sales[0]?.totalRevenue || 0,
                    totalRoyalty: sales[0]?.totalRoyalty || 0
                }
            };
        }));

        res.json(authorStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update author details
router.put('/authors/:authorId', auth, isAdmin, async (req, res) => {
    try {
        const { authorId } = req.params;
        const updates = req.body;
        
        // Remove sensitive fields from updates
        delete updates.password;
        delete updates.role;

        const author = await Author.findByIdAndUpdate(
            authorId,
            { $set: updates },
            { new: true }
        ).select('-password');

        if (!author) {
            return res.status(404).json({ message: 'Author not found' });
        }

        res.json(author);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update author's royalty rates
router.put('/authors/:authorId/royalty', auth, isAdmin, async (req, res) => {
    try {
        const { authorId } = req.params;
        const { bookId, newRoyaltyPercentage } = req.body;

        const book = await Book.findOneAndUpdate(
            { _id: bookId, author: authorId },
            { 
                $set: { 'publishingDetails.royaltyPercentage': newRoyaltyPercentage }
            },
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

// Get author's detailed performance
router.get('/authors/:authorId/performance', auth, isAdmin, async (req, res) => {
    try {
        const { authorId } = req.params;
        const { startDate, endDate } = req.query;

        const query = { author: authorId };
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const performance = await Sale.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    sales: { $sum: '$quantity' },
                    revenue: { $sum: '$amount' },
                    royalty: { $sum: '$royaltyEarned' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]);

        res.json(performance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;