// Basit user.js - Sadece sayfa çalışsın diye
console.log('User Dashboard loaded');

// Auth kontrolü
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');

if (!token || !user) {
    alert('Giriş yapmalısınız!');
    window.location.href = '../login/index.html';
}

const userData = JSON.parse(user);

// Kullanıcı ismini göster
document.getElementById('userName').textContent = `Hoş geldiniz, ${userData.username}`;

// Logout butonu
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../login/index.html';
});

// Bugünün tarihini otomatik doldur
document.getElementById('searchDate').valueAsDate = new Date();