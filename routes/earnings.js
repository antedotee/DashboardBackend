// Path: /Users/devanshydv/Documents/Backend/routes/earnings.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Earning = require('../models/Earning');
const Sale = require('../models/Sale');

router.get('/report', auth, async (req, res) => {
    try {
        const { year, month } = req.query;
        const query = { author: req.user.userId };
        
        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);

        const earnings = await Earning.find(query)
            .populate('book', 'title isbn')
            .sort({ year: -1, month: -1 });

        const totals = await Earning.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalRoyalty: { $sum: '$royaltyEarned' },
                    totalSales: { $sum: '$salesCount' }
                }
            }
        ]);

        res.json({
            earnings,
            summary: totals[0] || { totalRoyalty: 0, totalSales: 0 }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/analytics', auth, async (req, res) => {
    try {
        const yearlyEarnings = await Earning.aggregate([
            { $match: { author: req.user.userId } },
            {
                $group: {
                    _id: {
                        year: '$year',
                        month: '$month'
                    },
                    totalEarnings: { $sum: '$royaltyEarned' },
                    totalSales: { $sum: '$salesCount' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        const bookwiseEarnings = await Earning.aggregate([
            { $match: { author: req.user.userId } },
            {
                $group: {
                    _id: '$book',
                    totalEarnings: { $sum: '$royaltyEarned' },
                    totalSales: { $sum: '$salesCount' }
                }
            }
        ]).populate('_id', 'title');

        res.json({
            monthlyTrends: yearlyEarnings,
            bookwiseEarnings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get earnings trends
router.get('/trends', auth, async (req, res) => {
    try {
        const authorId = req.user.userId;
        const { period = 'yearly' } = req.query;
        const currentDate = new Date();
        let startDate;

        // Set time period for analysis
        switch (period) {
            case 'monthly':
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 12));
                break;
            case 'quarterly':
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 15));
                break;
            case 'yearly':
                startDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 2));
                break;
            default:
                startDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1));
        }

        const trends = await Sale.aggregate([
            {
                $match: {
                    author: new mongoose.Types.ObjectId(authorId),
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    earnings: { $sum: '$royaltyEarned' },
                    sales: { $sum: '$quantity' },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Calculate growth rates
        const trendData = trends.map((month, index) => {
            const previousMonth = trends[index - 1];
            const growthRate = previousMonth ? 
                ((month.earnings - previousMonth.earnings) / previousMonth.earnings) * 100 : 0;

            return {
                period: `${month._id.year}-${month._id.month}`,
                earnings: month.earnings,
                sales: month.sales,
                revenue: month.revenue,
                growthRate: parseFloat(growthRate.toFixed(2))
            };
        });

        res.json({
            period,
            trends: trendData,
            summary: {
                totalEarnings: trendData.reduce((acc, curr) => acc + curr.earnings, 0),
                averageMonthlyEarnings: trendData.reduce((acc, curr) => acc + curr.earnings, 0) / trendData.length,
                highestEarningMonth: trendData.reduce((max, curr) => curr.earnings > max.earnings ? curr : max, trendData[0]),
                averageGrowthRate: trendData.reduce((acc, curr) => acc + curr.growthRate, 0) / (trendData.length - 1)
            }
        });

    } catch (error) {
        console.error('Earnings trends error:', error);
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;