const express = require('express');
const router = express.Router();
const { register, login, logout, verifyToken } = require('../controller/auth.controller');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', verifyToken); // Token doğrulama endpoint'i ekle

module.exports = router;