// Path: /Users/devanshdv/Documents/Backend/routes/sales.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Sale = require('../models/Sale');
const Book = require('../models/Book');

router.post('/', auth, async (req, res) => {
    try {
        const { bookId, quantity, amount } = req.body;
        const book = await Book.findById(bookId);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const royaltyEarned = (amount * book.publishingDetails.royaltyPercentage) / 100;

        const sale = new Sale({
            book: bookId,
            author: req.user.userId,
            quantity,
            amount,
            royaltyEarned
        });

        await sale.save();

        await Book.findByIdAndUpdate(bookId, {
            $inc: {
                'publishingDetails.soldCopies': quantity,
                'publishingDetails.royaltyEarned': royaltyEarned
            }
        });

        res.status(201).json(sale);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/analytics', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = {
            author: req.user.userId,
            date: {}
        };

        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);

        const salesAnalytics = await Sale.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" }
                    },
                    totalSales: { $sum: "$quantity" },
                    totalRevenue: { $sum: "$amount" },
                    totalRoyalty: { $sum: "$royaltyEarned" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);

        res.json(salesAnalytics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add sales report endpoint
router.get('/report', auth, async (req, res) => {
    try {
        const authorId = req.user.userId;
        const { startDate, endDate } = req.query;

        const query = {
            author: authorId
        };

        // Add date range if provided
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const salesReport = await Sale.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalSales: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$amount' },
                    totalRoyalty: { $sum: '$royaltyEarned' },
                    transactions: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': -1, '_id.month': -1 }
            }
        ]);

        // Get book-wise breakdown
        const bookwiseSales = await Sale.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$book',
                    totalSales: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$amount' },
                    totalRoyalty: { $sum: '$royaltyEarned' }
                }
            },
            { $sort: { totalSales: -1 } }
        ]);

        const populatedBookSales = await Book.populate(bookwiseSales, {
            path: '_id',
            select: 'title genre price'
        });

        res.json({
            summary: {
                totalPeriods: salesReport.length,
                totalRevenue: salesReport.reduce((acc, curr) => acc + curr.totalRevenue, 0),
                totalRoyalty: salesReport.reduce((acc, curr) => acc + curr.totalRoyalty, 0),
                totalSales: salesReport.reduce((acc, curr) => acc + curr.totalSales, 0)
            },
            monthlyData: salesReport,
            bookwiseData: populatedBookSales,
            dateRange: {
                start: startDate || 'All time',
                end: endDate || 'Current'
            }
        });

    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ message: error.message });
    }
});
// Update export endpoint
router.get('/export', auth, async (req, res) => {
    try {
        const { format = 'csv', startDate, endDate } = req.query;
        const query = { author: req.user.userId };
        
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const sales = await Sale.find(query)
            .populate('book', 'title price')
            .sort({ date: -1 });

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
            
            const csvData = [
                ['Date', 'Book Title', 'Quantity', 'Amount', 'Royalty Earned'],
                ...sales.map(sale => [
                    sale.date.toISOString().split('T')[0],
                    sale.book.title,
                    sale.quantity,
                    sale.amount,
                    sale.royaltyEarned
                ])
            ].map(row => row.join(',')).join('\n');

            res.send(csvData);
        } else {
            res.json(sales);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Add recent sales with pagination
router.get('/recent', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const sales = await Sale.find({ author: req.user.userId })
            .populate('book', 'title price')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Sale.countDocuments({ author: req.user.userId });

        res.json({
            sales,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;