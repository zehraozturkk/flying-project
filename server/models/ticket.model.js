const db = require('../config/db');

// Tickets tablosunu oluşturma
const createTicketsTable = () => {
  const query = `
    CREATE TABLE IF NOT EXISTS tickets(
      ticket_id INT AUTO_INCREMENT PRIMARY KEY,
      passenger_name VARCHAR(50) NOT NULL,
      passenger_email VARCHAR(100) NOT NULL,
      flight_id INT NOT NULL,
      seat_number VARCHAR(10) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (flight_id) REFERENCES flights(flight_id)
    );
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error creating tickets table:', err);
    } else {
      console.log('Tickets table created successfully');
    }
  });
};

module.exports = {
  createTicketsTable,
}