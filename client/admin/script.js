// Admin Dashboard Script
console.log('Admin Dashboard loaded');

// Global değişkenler
let cities = [];
let flights = [];
let isEditMode = false;
let currentEditFlightId = null;

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

// API URL'leri
const API_BASE = 'http://localhost:3000/api'; // Backend URL'inizi buraya yazın

// Utility fonksiyonlar
const showAlert = (message, type = 'info') => {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
};

const showLoading = (show = true) => {
    const loading = document.getElementById('loadingOverlay');
    loading.style.display = show ? 'flex' : 'none';
};

// API çağrıları
const apiCall = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            ...options
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Bir hata oluştu');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Şehirleri yükle
const loadCities = async () => {
    try {
        const data = await apiCall('/cities');
        cities = data.cities;
        
        // Dropdown'ları doldur
        const fromCitySelect = document.getElementById('fromCity');
        const toCitySelect = document.getElementById('toCity');
        
        // Mevcut seçenekleri temizle
        fromCitySelect.innerHTML = '<option value="">Şehir Seçin</option>';
        toCitySelect.innerHTML = '<option value="">Şehir Seçin</option>';
        
        // Şehirleri ekle
        cities.forEach(city => {
            const option1 = new Option(city.city_name, city.city_name);
            const option2 = new Option(city.city_name, city.city_name);
            fromCitySelect.add(option1);
            toCitySelect.add(option2);
        });
        
        console.log('Şehirler yüklendi:', cities.length);
    } catch (error) {
        console.error('Şehirler yüklenirken hata:', error);
        showAlert('Şehirler yüklenemedi: ' + error.message, 'error');
    }
};

// Uçuşları yükle
const loadFlights = async () => {
    try {
        showLoading(true);
        const data = await apiCall('/flights');
        flights = data.flights;
        displayFlights();
        updateStats();
        console.log('Uçuşlar yüklendi:', flights.length);
    } catch (error) {
        console.error('Uçuşlar yüklenirken hata:', error);
        showAlert('Uçuşlar yüklenemedi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Uçuşları tabloda göster
const displayFlights = () => {
    const tbody = document.getElementById('flightsTableBody');
    tbody.innerHTML = '';
    
    if (flights.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Henüz uçuş bulunmuyor</td></tr>';
        return;
    }
    
    flights.forEach(flight => {
        const row = document.createElement('tr');
        
        const departureDate = new Date(flight.departure_time);
        const arrivalDate = new Date(flight.arrival_time);
        
        row.innerHTML = `
            <td>#${flight.flight_id}</td>
            <td>${flight.from_city_name}</td>
            <td>${flight.to_city_name}</td>
            <td>${departureDate.toLocaleString('tr-TR')}</td>
            <td>${arrivalDate.toLocaleString('tr-TR')}</td>
            <td>₺${flight.price.toLocaleString('tr-TR')}</td>
            <td>${flight.seats_available}/${flight.seats_total}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-edit" onclick="editFlight(${flight.flight_id})">
                        Düzenle
                    </button>
                    <button class="btn-small btn-delete" onclick="deleteFlight(${flight.flight_id})">
                        Sil
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
};

// İstatistikleri güncelle
const updateStats = () => {
    document.getElementById('totalFlights').textContent = flights.length;
    
    // Basit istatistikler (gerçek rezervasyon sistemi olmadığı için varsayılan değerler)
    document.getElementById('totalBookings').textContent = flights.length * 15; // Ortalama
    document.getElementById('totalRevenue').textContent = '₺' + (flights.reduce((sum, f) => sum + (f.price * (f.seats_total - f.seats_available)), 0)).toLocaleString('tr-TR');
    document.getElementById('todayBookings').textContent = Math.floor(Math.random() * 10);
};

// Form işlevlerini ayarla
const setupFormEvents = () => {
    const addFlightBtn = document.getElementById('addFlightBtn');
    const flightFormContainer = document.getElementById('flightFormContainer');
    const cancelFlightBtn = document.getElementById('cancelFlightBtn');
    const flightForm = document.getElementById('flightForm');
    
    // Yeni uçuş ekleme formu göster
    addFlightBtn.addEventListener('click', () => {
        showFlightForm(false); // false = edit mode değil
    });
    
    // Form iptal
    cancelFlightBtn.addEventListener('click', () => {
        hideFlightForm();
    });
    
    // Form gönderimi
    flightForm.addEventListener('submit', handleFlightSubmit);
    
    // Tarih validasyonu
    const departureInput = document.getElementById('departureTime');
    const arrivalInput = document.getElementById('arrivalTime');
    
    departureInput.addEventListener('change', () => {
        if (departureInput.value) {
            // Kalkış zamanından en az 30 dakika sonra varış
            const departure = new Date(departureInput.value);
            departure.setMinutes(departure.getMinutes() + 30);
            arrivalInput.min = departure.toISOString().slice(0, 16);
        }
    });
};

// Uçuş formunu göster
const showFlightForm = (editMode = false, flightData = null) => {
    const flightFormContainer = document.getElementById('flightFormContainer');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const addFlightBtn = document.getElementById('addFlightBtn');
    const flightForm = document.getElementById('flightForm');
    
    isEditMode = editMode;
    
    if (editMode && flightData) {
        // Düzenleme modu
        formTitle.textContent = 'Uçuş Düzenle';
        submitBtn.textContent = 'Uçuş Güncelle';
        currentEditFlightId = flightData.flight_id;
        
        // Form verilerini doldur
        document.getElementById('flightId').value = flightData.flight_id;
        document.getElementById('fromCity').value = flightData.from_city_name;
        document.getElementById('toCity').value = flightData.to_city_name;
        
        // Tarih formatını düzenle (datetime-local için)
        const departureDate = new Date(flightData.departure_time);
        const arrivalDate = new Date(flightData.arrival_time);
        
        document.getElementById('departureTime').value = formatDateForInput(departureDate);
        document.getElementById('arrivalTime').value = formatDateForInput(arrivalDate);
        document.getElementById('price').value = flightData.price;
        document.getElementById('seatsTotal').value = flightData.seats_total;
    } else {
        // Yeni ekleme modu
        formTitle.textContent = 'Yeni Uçuş Ekle';
        submitBtn.textContent = 'Uçuş Ekle';
        currentEditFlightId = null;
        flightForm.reset();
        document.getElementById('flightId').value = '';
    }
    
    flightFormContainer.classList.remove('hidden');
    addFlightBtn.style.display = 'none';
};

// Uçuş formunu gizle
const hideFlightForm = () => {
    const flightFormContainer = document.getElementById('flightFormContainer');
    const addFlightBtn = document.getElementById('addFlightBtn');
    const flightForm = document.getElementById('flightForm');
    
    flightFormContainer.classList.add('hidden');
    addFlightBtn.style.display = 'block';
    flightForm.reset();
    isEditMode = false;
    currentEditFlightId = null;
};

// Tarih formatını input için düzenle
const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Uçuş düzenleme
const editFlight = async (flightId) => {
    const flight = flights.find(f => f.flight_id === flightId);
    if (!flight) {
        showAlert('Uçuş bulunamadı!', 'error');
        return;
    }
    
    showFlightForm(true, flight);
};

// Uçuş ekleme/güncelleme form handler
const handleFlightSubmit = async (e) => {
    e.preventDefault();
    
    const flightData = {
        from_city: document.getElementById('fromCity').value,
        to_city: document.getElementById('toCity').value,
        departure_time: document.getElementById('departureTime').value.replace('T', ' ') + ':00',
        arrival_time: document.getElementById('arrivalTime').value.replace('T', ' ') + ':00',
        price: parseFloat(document.getElementById('price').value),
        seats_total: parseInt(document.getElementById('seatsTotal').value)
    };
    
    // Validasyon
    if (flightData.from_city === flightData.to_city) {
        showAlert('Kalkış ve varış şehri aynı olamaz!', 'error');
        return;
    }
    
    const departureDate = new Date(flightData.departure_time);
    const arrivalDate = new Date(flightData.arrival_time);
    
    if (arrivalDate <= departureDate) {
        showAlert('Varış zamanı kalkış zamanından sonra olmalıdır!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        console.log('Gönderilecek veri:', flightData);
        
        let result;
        let successMessage;
        
        if (isEditMode && currentEditFlightId) {
            // Güncelleme modu
            result = await apiCall(`/flights/${currentEditFlightId}`, {
                method: 'PUT',
                body: JSON.stringify(flightData)
            });
            successMessage = 'Uçuş başarıyla güncellendi!';
        } else {
            // Ekleme modu
            result = await apiCall('/flights', {
                method: 'POST',
                body: JSON.stringify(flightData)
            });
            successMessage = 'Uçuş başarıyla eklendi!';
        }
        
        if (result.success) {
            showAlert(successMessage, 'success');
            hideFlightForm();
            await loadFlights(); // Listeyi yenile
        }
    } catch (error) {
        console.error('Uçuş işlemi sırasında hata:', error);
        const errorMessage = isEditMode ? 'Uçuş güncellenemedi: ' : 'Uçuş eklenemedi: ';
        showAlert(errorMessage + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Uçuş silme
const deleteFlight = async (flightId) => {
    if (!confirm('Bu uçuşu silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        showLoading(true);
        await apiCall(`/flights/${flightId}`, {
            method: 'DELETE'
        });
        
        showAlert('Uçuş başarıyla silindi!', 'success');
        await loadFlights(); // Listeyi yenile
    } catch (error) {
        console.error('Uçuş silinirken hata:', error);
        showAlert('Uçuş silinemedi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadCities();
        await loadFlights();
        setupFormEvents();
        
        // Minimum tarih olarak bugünü ayarla
        const now = new Date();
        const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('departureTime').min = minDateTime;
        document.getElementById('arrivalTime').min = minDateTime;
        
        console.log('Admin dashboard hazır');
    } catch (error) {
        console.error('Sayfa yüklenirken hata:', error);
        showAlert('Sayfa yüklenirken hata oluştu', 'error');
    }
});

// Refresh butonları
document.getElementById('refreshBookingsBtn')?.addEventListener('click', () => {
    loadFlights();
    showAlert('Veriler yenilendi', 'success');
});