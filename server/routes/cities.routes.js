const express = require('express');
const router = express.Router();
const { getCities, getPopularCities } = require('../controller/cities.controller');

// Tüm şehirleri getir
router.get('/cities', getCities);

// Popüler şehirleri getir

module.exports = router;