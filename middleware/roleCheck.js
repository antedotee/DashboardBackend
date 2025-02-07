// Path: /Users/devanshdv/Documents/Backend/middleware/roleCheck.js
const roleCheck = (roles) => {
    return async (req, res, next) => {
        try {
            // Check if user has the required role
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Access denied' });
            }

            // If it's an author trying to update a book, verify ownership
            if (req.user.role === 'author' && req.method === 'PUT') {
                const Book = require('../models/Book');
                const book = await Book.findById(req.params.bookId);
                
                if (!book) {
                    return res.status(404).json({ message: 'Book not found' });
                }

                // Check if the author owns this book
                if (book.authorId.toString() !== req.user.userId) {
                    return res.status(403).json({ message: 'Access denied. You can only update your own books.' });
                }
            }

            next();
        } catch (error) {
            res.status(500).json({ message: 'Server error in role verification' });
        }
    };
};

module.exports = roleCheck;