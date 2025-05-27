const db = require('../config/db');

// Flights tablosunu oluşturma
const createFlightsTable = () => {
  const query = `
    CREATE TABLE IF NOT EXISTS flights(
      flight_id INT  AUTO_INCREMENT PRIMARY KEY,
      from_city VARCHAR(50) NOT NULL,
      to_city VARCHAR(50) NOT NULL,
      departure_time DATETIME NOT NULL,
      arrival_time DATETIME NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      seats_total INT NOT NULL,
      seats_available INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (from_city) REFERENCES cities(city_id),
      FOREIGN KEY (to_city) REFERENCES cities(city_id)
    );
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error creating flights table:', err);
    } else {
      console.log('Flights table created successfully');
    }
  });
};

module.exports = {
  createFlightsTable
}