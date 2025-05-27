const express = require('express');
const router = express.Router();

// Flight controller'ı import et
const { add_flight,getFlights, deleteFlight, updateFlight } = require('../controller/flight.controller'); // controller dosyanızın yolunu ayarlayın

// POST route - Yeni uçuş ekleme
router.post('/flights', add_flight);

router.get('/flights', getFlights);

// Uçuş silme
router.delete('/flights/:flightId', deleteFlight);

router.put('/flights/:flightId', updateFlight);

module.exports = router;