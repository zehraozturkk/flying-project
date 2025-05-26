const router = require('express').Router();
const Flights  = require('../controller/flight.controller');

router.get("/",Flights.all_flights);
router.post("/create",Flights.create_flight);

router.delete("/:id",Flights.delete_flight);
