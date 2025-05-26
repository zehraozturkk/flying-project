const express = require('express');
require('dotenv').config();
const cors = require('cors');
const db = require('./config/db');

const app = express();
app.use(express.json());

app.use(cors({
    origin: [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://127.0.0.1:3001',
        'http://localhost:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


// Sadece bu endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Test working' });
});

app.use('/auth', require('./routes/user.routes'));


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});