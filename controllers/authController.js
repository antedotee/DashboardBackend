// Path: /Users/devanshdv/Documents/Backend/controllers/authController.js
const User = require('../models/User');
const Sale = require('../models/Sale');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({
            username,
            email,
            password,
            role
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create JWT token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create JWT token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Add these new methods to your existing authController
exports.getProfile = async (req, res) => {
    try {
        const author = await User.findById(req.user.userId)
            .select('-password');
        
        const authorStats = await Sale.aggregate([
            { $match: { author: author._id } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$quantity" },
                    totalRevenue: { $sum: "$royaltyEarned" },
                    numberOfBooks: { 
                        $sum: { 
                            $cond: [
                                { $gt: ["$quantity", 0] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        res.json({
            profile: author,
            stats: authorStats[0] || { totalSales: 0, totalRevenue: 0, numberOfBooks: 0 }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password;
        delete updates.role;

        const author = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        res.json(author);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};