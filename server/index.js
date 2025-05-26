const express = require('express');
const cors = require('cors');

const app = express();

// Middleware'ler
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Flight Booking API is running!',
    version: '1.0.0'
  });
});