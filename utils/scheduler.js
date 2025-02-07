// Path: /Users/devanshydv/Documents/Backend/utils/scheduler.js
const cron = require('node-cron');
const moment = require('moment');
const { calculateMonthlyEarnings } = require('./earningsCalculator');
const User = require('../models/User');

cron.schedule('0 0 1 * *', async () => {
    try {
        const authors = await User.find({ role: 'author' });
        const previousMonth = moment().subtract(1, 'months');
        
        for (const author of authors) {
            await calculateMonthlyEarnings(
                author._id,
                previousMonth.year(),
                previousMonth.month() + 1
            );
        }
        console.log('Monthly earnings calculated successfully');
    } catch (error) {
        console.error('Error in scheduled earnings calculation:', error);
    }
});