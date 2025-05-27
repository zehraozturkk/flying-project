const express = require('express');
const router = express.Router();

const { 
    createTicket, 
    getUserTickets, 
    getAllTickets, 
    cancelTicket, 
    getFlightTickets 
} = require('../controller/ticket.controller');

router.post('/tickets', createTicket);

router.get('/tickets/user', getUserTickets);

router.get('/tickets', getAllTickets);

router.delete('/tickets/:ticketId', cancelTicket);

router.get('/tickets/flight/:flightId', getFlightTickets);

module.exports = router;