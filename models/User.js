const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['author', 'admin'], default: 'author' },
    profile: {
        name: String,
        avatar: String,
        location: String,
        memberSince: { type: Date, default: Date.now },
        totalWorks: { type: Number, default: 0 },
        achievements: [String],
        bio: String
    },
    stats: {
        publications: { type: Number, default: 0 },
        avgRating: { type: Number, default: 0 },
        followers: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

module.exports = mongoose.model('User', userSchema);