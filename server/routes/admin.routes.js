const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
    createFlight, 
    updateFlight, 
    deleteFlight, 
    getAllBookings 
} = require('../controller/admin.controller');

// Tüm admin routes'ları korumalı
router.use(authenticateToken, requireAdmin);

// Admin flight management
router.post('/flights', createFlight);        // POST /admin/flights
router.put('/flights/:id', updateFlight);     // PUT /admin/flights/123
router.delete('/flights/:id', deleteFlight);  // DELETE /admin/flights/123

// Admin booking management
router.get('/bookings', getAllBookings);      // GET /admin/bookings

module.exports = router;