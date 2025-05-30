const express = require('express');
const router = express.Router();
const { registerUser, loginUser, refreshTokenUser, logoutUser } = require('../controllers/user.controller');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshTokenUser);
router.post('/logout', logoutUser);

module.exports = router;