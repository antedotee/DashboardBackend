// Path: /Users/devanshdv/Documents/Backend/routes/author.js
const express = require('express');
const router = express.Router();
const { createAuthor, getAuthors } = require('../controllers/authorController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/', auth, roleCheck(['admin']), createAuthor);
router.get('/', getAuthors);

module.exports = router;