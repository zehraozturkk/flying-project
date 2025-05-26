// scripts/setup.js
const { createCitiesTable, insertCities } = require('../models/city.model');
const { createFlightsTable } = require('../models/flight.model');
const { createTicketsTable } = require('../models/ticket.model');
const { createAdminsTable } = require('../models/admin.model');
const { createUsersTable } = require('../models/user.model');

// Veritabanı kurulumu
const setupDatabase = async () => {
  console.log('Setting up database tables...\n');
  
  try {
    // Sıralama önemli - foreign key ilişkileri nedeniyle
    console.log('Creating cities table...');
    await new Promise((resolve, reject) => {
      createCitiesTable();
      setTimeout(resolve, 1000);
    });

    console.log('Inserting cities...');
    await new Promise((resolve, reject) => {
      insertCities();
      setTimeout(resolve, 1000); // veri ekleme işlemi tamamlanana kadar bekle
    });
    
    console.log('Creating flights table...');
    await new Promise((resolve, reject) => {
      createFlightsTable();
      setTimeout(resolve, 1000);
    });
    
    console.log('Creating tickets table...');
    await new Promise((resolve, reject) => {
      createTicketsTable();
      setTimeout(resolve, 1000);
    });
    
    console.log('Creating admins table...');
    await new Promise((resolve, reject) => {
      createAdminsTable();
      setTimeout(resolve, 1000);
    });

    console.log('Creating users table...');
    await new Promise((resolve, reject) => {
      createUsersTable();
      setTimeout(resolve, 1000);
    });
    
    console.log('\n Database setup completed successfully!');
    console.log('You can now start your server with: npm start');
    
    // Process'i sonlandır
    process.exit(0);
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
};

// Script'i çalıştır
setupDatabase();