const db = require('../config/db');

// Admins tablosunu oluşturma
const createUsersTable = () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users(
      user_id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(20) NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('users table created successfully');
    }
  });
};

module.exports = {
  createUsersTable
}