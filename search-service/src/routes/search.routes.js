const express = require('express');
const router = express.Router();
const { searchPost } = require('../controllers/search.controller');
const { authenticateRequest } = require('../middlewares/auth.middleware');

// Search route
router.get('/posts', authenticateRequest, searchPost);

module.exports = router;
