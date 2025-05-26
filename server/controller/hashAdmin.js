const bcrypt = require('bcrypt');

const password = 'admin123';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Şifre:', password);
console.log('Hash:', hash);
console.log('\nSQL Update komutu:');
console.log(`UPDATE admins SET password = '${hash}' WHERE email = 'admin@flyticket.com';`);