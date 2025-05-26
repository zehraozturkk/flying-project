// Basit admin.js - Sadece sayfa çalışsın diye
console.log('Admin Dashboard loaded');

// Auth kontrolü
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');

if (!token || !user) {
    alert('Giriş yapmalısınız!');
    window.location.href = '../login/login.html';
}

const userData = JSON.parse(user);
if (userData.role !== 'admin') {
    alert('Admin yetkisi gerekli!');
    window.location.href = '../login/login.html';
}

// Admin ismini göster
document.getElementById('adminName').textContent = `Hoş geldiniz, ${userData.username}`;

// Logout butonu
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../login/login.html';
});

