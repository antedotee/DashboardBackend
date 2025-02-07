// Path: /Users/devanshydv/Documents/Backend/utils/earningsCalculator.js
const moment = require('moment');
const Sale = require('../models/Sale');
const Earning = require('../models/Earning');

const calculateMonthlyEarnings = async (authorId, year, month) => {
    try {
        const startDate = moment([year, month - 1]).startOf('month');
        const endDate = moment(startDate).endOf('month');

        const monthlyData = await Sale.aggregate([
            {
                $match: {
                    author: authorId,
                    date: {
                        $gte: startDate.toDate(),
                        $lte: endDate.toDate()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        book: '$book',
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalRoyalty: { $sum: '$royaltyEarned' },
                    totalSales: { $sum: '$quantity' }
                }
            }
        ]);

        const earningsPromises = monthlyData.map(async (data) => {
            const earning = await Earning.findOneAndUpdate(
                {
                    author: authorId,
                    book: data._id.book,
                    year: data._id.year,
                    month: data._id.month
                },
                {
                    $set: {
                        royaltyEarned: data.totalRoyalty,
                        salesCount: data.totalSales
                    }
                },
                { upsert: true, new: true }
            );
            return earning;
        });

        return Promise.all(earningsPromises);
    } catch (error) {
        console.error('Error calculating earnings:', error);
        throw error;
    }
};

module.exports = { calculateMonthlyEarnings };