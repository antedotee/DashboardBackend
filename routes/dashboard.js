// Path: /Users/devanshdv/Documents/Backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const moment = require('moment');
const mongoose = require('mongoose');  // Add this import
const Book = require('../models/Book');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Earning = require('../models/Earning');

// Main Dashboard Summary
router.get('/summary', auth, async (req, res) => {
    try {
        const authorId = req.user.userId;
        const currentDate = moment();
        const startOfMonth = moment().startOf('month');
        const previousMonth = moment().subtract(1, 'month').startOf('month');
        const startOfYear = moment().startOf('year');

        // Overall Stats
        const overallStats = await Book.aggregate([
            { $match: { author: authorId } },
            {
                $group: {
                    _id: null,
                    totalBooks: { $sum: 1 },
                    totalInventory: { $sum: '$publishingDetails.quantity' },
                    avgRoyaltyPercentage: { $avg: '$publishingDetails.royaltyPercentage' },
                    totalEarnings: { $sum: '$publishingDetails.royaltyEarned' }
                }
            }
        ]);

        // Monthly Performance
        const monthlyPerformance = await Sale.aggregate([
            {
                $match: {
                    author: authorId,
                    date: { 
                        $gte: previousMonth.toDate(),
                        $lte: currentDate.toDate()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalRoyalty: { $sum: '$royaltyEarned' },
                    totalSales: { $sum: '$quantity' }
                }
            }
        ]);

        // Calculate growth
        const currentMonthData = monthlyPerformance.find(m => 
            m._id.month === currentDate.month() + 1) || { totalRoyalty: 0, totalSales: 0 };
        const previousMonthData = monthlyPerformance.find(m => 
            m._id.month === previousMonth.month() + 1) || { totalRoyalty: 0 };
        const growth = previousMonthData.totalRoyalty ? 
            ((currentMonthData.totalRoyalty - previousMonthData.totalRoyalty) / previousMonthData.totalRoyalty) * 100 : 0;

        const monthlyEarnings = await Sale.aggregate([
            {
                $match: {
                    author: authorId,
                    date: { $gte: startOfMonth.toDate() }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRoyalty: { $sum: '$royaltyEarned' },
                    totalSales: { $sum: '$quantity' }
                }
            }
        ]);

        const yearlyTrend = await Sale.aggregate([
            {
                $match: {
                    author: authorId,
                    date: { $gte: startOfYear.toDate() }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$date' }
                    },
                    earnings: { $sum: '$royaltyEarned' },
                    sales: { $sum: '$quantity' }
                }
            },
            { $sort: { '_id.month': 1 } }
        ]);

        const topBooks = await Sale.aggregate([
            { $match: { author: authorId } },
            {
                $group: {
                    _id: '$book',
                    totalSales: { $sum: '$quantity' },
                    totalRoyalty: { $sum: '$royaltyEarned' }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 5 }
        ]);

        const inventoryAlerts = await Inventory.find({
            author: authorId,
            quantityAvailable: { $lt: 20 }
        }).populate('book', 'title');

        const recentTransactions = await Sale.find({ author: authorId })
            .sort({ date: -1 })
            .limit(5)
            .populate('book', 'title');

        const dashboardData = {
            overallStats: overallStats[0] || {
                totalBooks: 0,
                totalInventory: 0,
                avgRoyaltyPercentage: 0
            },
            monthlyPerformance: monthlyEarnings[0] || {
                totalRoyalty: 0,
                totalSales: 0
            },
            yearlyTrend,
            topBooks: await Book.populate(topBooks, { path: '_id', select: 'title' }),
            inventoryAlerts,
            recentTransactions,
            lastUpdated: new Date()
        };

        res.json(dashboardData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add new endpoints for Monthly Revenue
router.get('/earnings/monthly', auth, async (req, res) => {
    try {
        const authorId = req.user.userId;
        const currentMonth = moment().startOf('month');
        const target = 15000; // You might want to make this configurable

        const monthlyRevenue = await Sale.aggregate([
            {
                $match: {
                    author: authorId,
                    date: { $gte: currentMonth.toDate() }
                }
            },
            {
                $group: {
                    _id: null,
                    current: { $sum: '$royaltyEarned' }
                }
            }
        ]);

        const current = monthlyRevenue[0]?.current || 0;
        const progress = (current / target) * 100;

        res.json({
            monthlyRevenue: {
                target,
                current,
                progress,
                growth: 28.14 // Calculate this based on previous month
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/genre-analytics', auth, async (req, res) => {
    try {
        const genreStats = await Book.aggregate([
            { $match: { author: req.user.userId } },
            {
                $group: {
                    _id: '$genre',
                    bookCount: { $sum: 1 },
                    totalSales: { $sum: '$publishingDetails.soldCopies' },
                    avgRoyalty: { $avg: '$publishingDetails.royaltyEarned' }
                }
            }
        ]);

        res.json(genreStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Book Analytics Endpoint
router.get('/books/:bookId/analytics', auth, async (req, res) => {
    try {
        const { bookId } = req.params;
        const authorId = req.user.userId;

        // First, fetch the book
        const book = await Book.findOne({ 
            _id: new mongoose.Types.ObjectId(bookId), 
            author: new mongoose.Types.ObjectId(authorId) 
        });

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // Get monthly sales trend
        const monthlySales = await Sale.aggregate([
            {
                $match: {
                    book: new mongoose.Types.ObjectId(bookId),
                    author: new mongoose.Types.ObjectId(authorId)
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$date' },
                        year: { $year: '$date' }
                    },
                    monthlySales: { $sum: '$quantity' },
                    monthlyRevenue: { $sum: '$royaltyEarned' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]);

        // Get current inventory status
        const inventory = await Inventory.findOne({ book: bookId });

        const analytics = {
            bookInfo: {
                title: book.title,
                isbn: book.isbn,
                genre: book.genre,
                price: book.price,
                publishingDetails: book.publishingDetails
            },
            currentStats: {
                totalSales: book.publishingDetails.soldCopies,
                totalRevenue: book.publishingDetails.royaltyEarned,
                currentStock: inventory ? inventory.quantityAvailable : 0,
                stockStatus: inventory ? 
                    (inventory.quantityAvailable < 20 ? 'Low' : 'Adequate') : 'Unknown'
            },
            salesTrend: monthlySales.map(month => ({
                month: moment().month(month._id.month - 1).format('MMM'),
                year: month._id.year,
                sales: month.monthlySales,
                revenue: month.monthlyRevenue
            })),
            lastUpdated: new Date()
        };

        res.json(analytics);
    } catch (error) {
        console.error('Book analytics error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add performance metrics endpoint
router.get('/performance-metrics', auth, async (req, res) => {
    try {
        const authorId = req.user.userId;
        const currentMonth = moment().startOf('month');
        
        // Get key performance indicators
        const kpis = await Sale.aggregate([
            {
                $match: {
                    author: new mongoose.Types.ObjectId(authorId),
                    date: { $gte: currentMonth.toDate() }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    averageOrderValue: { $avg: '$amount' },
                    totalOrders: { $sum: 1 },
                    totalUnits: { $sum: '$quantity' }
                }
            }
        ]);

        res.json({
            kpis: kpis[0] || {
                totalRevenue: 0,
                averageOrderValue: 0,
                totalOrders: 0,
                totalUnits: 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;