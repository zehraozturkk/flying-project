const db = require('../config/db');

// Admins tablosunu oluşturma
const createAdminsTable = () => {
  const query = `
    CREATE TABLE IF NOT EXISTS admins(
      id INT PRIMARY KEY AUTO_INCREMENT,
      admin_id VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(20) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error creating admins table:', err);
    } else {
      console.log('Admins table created successfully');
    }
  });
};

module.exports = {
  createAdminsTable
}