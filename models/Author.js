// Path: /Users/devanshydv/Documents/Backend/models/Author.js
const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    bio: String,
    location: String,
    publishedBooks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
    }],
    stats: {
        totalPublications: { type: Number, default: 0 },
        totalSales: { type: Number, default: 0 },
        avgRating: { type: Number, default: 0 },
        followers: { type: Number, default: 0 }
    },
    memberSince: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Author', authorSchema);