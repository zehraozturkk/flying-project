// Admin Dashboard Script
console.log('Admin Dashboard loaded');

// Global değişkenler
let cities = [];
let flights = [];
let reservations = []; // Rezervasyonlar için yeni global değişken
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
    window.location.href = '../login/index.html';
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
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
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

// HTML escape fonksiyonu (güvenlik için)
const escapeHtml = (text) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
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

// *** YENİ: Rezervasyonları yükle ***
const loadReservations = async () => {
    try {
        const tableBody = document.getElementById('bookingsTableBody'); // Doğru ID kullan
        if (!tableBody) {
            console.log('Rezervasyon tablosu bulunamadı (bookingsTableBody)');
            return;
        }
        
        // Loading state göster
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="loading-spinner"></div>
                    Rezervasyonlar yükleniyor...
                </td>
            </tr>
        `;
        
        // API endpoint'i düzelt
        const data = await apiCall('/all'); // /api/all yerine /all kullan
        console.log('Rezervasyon verisi:', data);
        
        if (data.success) {
            reservations = data.tickets;
            displayReservations();
            updateReservationStats();
            console.log('Rezervasyonlar yüklendi:', reservations.length + ' adet');
        } else {
            throw new Error(data.error || 'Rezervasyonlar yüklenemedi');
        }

    } catch (error) {
        console.error('Rezervasyon yükleme hatası:', error);
        showAlert('Rezervasyonlar yüklenirken hata oluştu: ' + error.message, 'error');
        const tableBody = document.getElementById('bookingsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center empty-state">
                        Rezervasyonlar yüklenemedi
                    </td>
                </tr>
            `;
        }
    }
};

// *** YENİ: Rezervasyonları tabloda göster - DÜZELTİLMİŞ VERSİYON ***
const displayReservations = () => {
    const tableBody = document.getElementById('bookingsTableBody');
    if (!tableBody) {
        console.log('Rezervasyon tablosu bulunamadı (bookingsTableBody)');
        return;
    }
    
    if (!reservations || reservations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center empty-state">
                    Henüz rezervasyon bulunmamaktadır
                </td>
            </tr>
        `;
        return;
    }

    const reservationsHTML = reservations.map(ticket => {
        // Tarih formatını düzenle
        const bookingDate = new Date(ticket.created_at).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Uçuş bilgisi oluştur
        const flightInfo = `${ticket.from_city} → ${ticket.to_city}`;
        
        // Departure time'ı düzenle - eğer string ise tarih formatına çevir
        let flightTime = '';
        if (ticket.departure_time) {
            const depTime = new Date(ticket.departure_time);
            if (!isNaN(depTime.getTime())) {
                flightTime = depTime.toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                flightTime = ticket.departure_time;
            }
        }

        return `
            <tr data-ticket-id="${ticket.ticket_id}">
                <td class="ticket-id">#${ticket.ticket_id}</td>
                <td class="passenger-name">${escapeHtml(ticket.passenger_name)}</td>
                <td class="passenger-email">${escapeHtml(ticket.passenger_email)}</td>
                <td class="flight-info">
                    <div class="flight-route">${flightInfo}</div>
                    <small class="flight-time">${flightTime}</small>
                    <small class="flight-id">Uçuş #${ticket.flight_id}</small>
                </td>
                <td class="booking-date">${bookingDate}</td>
                <td class="price">₺${parseFloat(ticket.price).toLocaleString('tr-TR')}</td>
                <td class="actions">
                    <button class="btn-cancel" onclick="cancelReservation(${ticket.ticket_id}, '${escapeHtml(ticket.passenger_name)}')">
                        İptal Et
                    </button>
                    <button class="btn-view-details" onclick="viewReservationDetails(${ticket.ticket_id})">
                        Detay
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = reservationsHTML;
};

// *** YENİ: Rezervasyon istatistiklerini güncelle ***
const updateReservationStats = () => {
    if (!reservations) return;
    
    const totalReservations = reservations.length;
    const totalRevenue = reservations.reduce((sum, ticket) => sum + parseFloat(ticket.price), 0);
    
    // İstatistik kartlarını güncelle
    const totalReservationsElement = document.getElementById('totalReservations');
    const totalRevenueElement = document.getElementById('totalRevenueFromTickets');
    
    if (totalReservationsElement) {
        totalReservationsElement.textContent = totalReservations;
    }
    
    if (totalRevenueElement) {
        totalRevenueElement.textContent = '₺' + totalRevenue.toLocaleString('tr-TR');
    }
};

// *** YENİ: Rezervasyon iptal etme ***
const cancelReservation = async (ticketId, passengerName) => {
    if (!confirm(`${passengerName} adlı yolcunun rezervasyonunu iptal etmek istediğinizden emin misiniz?`)) {
        return;
    }

    try {
        showLoading(true);
        
        // API endpoint'i düzelt
        const result = await apiCall(`/tickets/${ticketId}`, {
            method: 'DELETE'
        });

        if (result.success) {
            showAlert('Rezervasyon başarıyla iptal edildi', 'success');
            
            // Tablodan satırı kaldır
            const row = document.querySelector(`tr[data-ticket-id="${ticketId}"]`);
            if (row) {
                row.remove();
            }
            
            // Verileri yeniden yükle
            await loadReservations();
            await loadFlights(); // Uçuş koltuk sayılarını güncelle
            
        } else {
            throw new Error(result.error || 'Rezervasyon iptal edilemedi');
        }

    } catch (error) {
        console.error('Rezervasyon iptal hatası:', error);
        showAlert('Rezervasyon iptal edilirken hata oluştu: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// *** YENİ: Rezervasyon detaylarını görüntüle ***
const viewReservationDetails = async (ticketId) => {
    try {
        const row = document.querySelector(`tr[data-ticket-id="${ticketId}"]`);
        
        if (row) {
            const ticketInfo = {
                ticketId: ticketId,
                passengerName: row.querySelector('.passenger-name').textContent,
                passengerEmail: row.querySelector('.passenger-email').textContent,
                flightInfo: row.querySelector('.flight-route').textContent,
                flightTime: row.querySelector('.flight-time').textContent,
                bookingDate: row.querySelector('.booking-date').textContent,
                price: row.querySelector('.price').textContent
            };
            
            showReservationModal(ticketInfo);
        }

    } catch (error) {
        console.error('Rezervasyon detay hatası:', error);
        showAlert('Rezervasyon detayları yüklenirken hata oluştu', 'error');
    }
};

// *** YENİ: Rezervasyon detay modalını göster ***
const showReservationModal = (ticketInfo) => {
    const modalHTML = `
        <div class="modal-overlay" id="reservationModal" onclick="closeReservationModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Rezervasyon Detayları</h3>
                    <button class="modal-close" onclick="closeReservationModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-row">
                        <strong>Bilet ID:</strong> #${ticketInfo.ticketId}
                    </div>
                    <div class="detail-row">
                        <strong>Yolcu Adı:</strong> ${ticketInfo.passengerName}
                    </div>
                    <div class="detail-row">
                        <strong>Email:</strong> ${ticketInfo.passengerEmail}
                    </div>
                    <div class="detail-row">
                        <strong>Uçuş:</strong> ${ticketInfo.flightInfo}
                    </div>
                    <div class="detail-row">
                        <strong>Uçuş Zamanı:</strong> ${ticketInfo.flightTime}
                    </div>
                    <div class="detail-row">
                        <strong>Rezervasyon Tarihi:</strong> ${ticketInfo.bookingDate}
                    </div>
                    <div class="detail-row">
                        <strong>Fiyat:</strong> ${ticketInfo.price}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeReservationModal()">Kapat</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// *** YENİ: Modal kapatma ***
const closeReservationModal = () => {
    const modal = document.getElementById('reservationModal');
    if (modal) {
        modal.remove();
    }
};

// *** YENİ: Rezervasyonları yenile ***
const refreshReservations = () => {
    loadReservations();
};

// Uçuşları tabloda göster
const displayFlights = () => {
    const tbody = document.getElementById('flightsTableBody');
    if (!tbody) return;
    
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
    const totalFlightsElement = document.getElementById('totalFlights');
    const totalBookingsElement = document.getElementById('totalBookings');
    const totalRevenueElement = document.getElementById('totalRevenue');
    const todayBookingsElement = document.getElementById('todayBookings');
    
    if (totalFlightsElement) {
        totalFlightsElement.textContent = flights.length;
    }
    
    // Basit istatistikler
    if (totalBookingsElement) {
        totalBookingsElement.textContent = flights.length * 15; // Ortalama
    }
    
    if (totalRevenueElement) {
        const revenue = flights.reduce((sum, f) => sum + (f.price * (f.seats_total - f.seats_available)), 0);
        totalRevenueElement.textContent = '₺' + revenue.toLocaleString('tr-TR');
    }
    
    if (todayBookingsElement) {
        todayBookingsElement.textContent = Math.floor(Math.random() * 10);
    }
};

// Form işlevlerini ayarla
const setupFormEvents = () => {
    const addFlightBtn = document.getElementById('addFlightBtn');
    const flightFormContainer = document.getElementById('flightFormContainer');
    const cancelFlightBtn = document.getElementById('cancelFlightBtn');
    const flightForm = document.getElementById('flightForm');
    
    if (!addFlightBtn || !flightFormContainer || !cancelFlightBtn || !flightForm) return;
    
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
    
    if (departureInput && arrivalInput) {
        departureInput.addEventListener('change', () => {
            if (departureInput.value) {
                // Kalkış zamanından en az 30 dakika sonra varış
                const departure = new Date(departureInput.value);
                departure.setMinutes(departure.getMinutes() + 30);
                arrivalInput.min = departure.toISOString().slice(0, 16);
            }
        });
    }
};

// Uçuş formunu göster
const showFlightForm = (editMode = false, flightData = null) => {
    const flightFormContainer = document.getElementById('flightFormContainer');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const addFlightBtn = document.getElementById('addFlightBtn');
    const flightForm = document.getElementById('flightForm');
    
    if (!flightFormContainer || !flightForm) return;
    
    isEditMode = editMode;
    
    if (editMode && flightData) {
        // Düzenleme modu
        if (formTitle) formTitle.textContent = 'Uçuş Düzenle';
        if (submitBtn) submitBtn.textContent = 'Uçuş Güncelle';
        currentEditFlightId = flightData.flight_id;
        
        // Form verilerini doldur
        const flightIdField = document.getElementById('flightId');
        if (flightIdField) flightIdField.value = flightData.flight_id;
        
        const fromCityField = document.getElementById('fromCity');
        const toCityField = document.getElementById('toCity');
        if (fromCityField) fromCityField.value = flightData.from_city_name;
        if (toCityField) toCityField.value = flightData.to_city_name;
        
        // Tarih formatını düzenle (datetime-local için)
        const departureDate = new Date(flightData.departure_time);
        const arrivalDate = new Date(flightData.arrival_time);
        
        const departureTimeField = document.getElementById('departureTime');
        const arrivalTimeField = document.getElementById('arrivalTime');
        const priceField = document.getElementById('price');
        const seatsTotalField = document.getElementById('seatsTotal');
        
        if (departureTimeField) departureTimeField.value = formatDateForInput(departureDate);
        if (arrivalTimeField) arrivalTimeField.value = formatDateForInput(arrivalDate);
        if (priceField) priceField.value = flightData.price;
        if (seatsTotalField) seatsTotalField.value = flightData.seats_total;
    } else {
        // Yeni ekleme modu
        if (formTitle) formTitle.textContent = 'Yeni Uçuş Ekle';
        if (submitBtn) submitBtn.textContent = 'Uçuş Ekle';
        currentEditFlightId = null;
        flightForm.reset();
        const flightIdField = document.getElementById('flightId');
        if (flightIdField) flightIdField.value = '';
    }
    
    flightFormContainer.classList.remove('hidden');
    if (addFlightBtn) addFlightBtn.style.display = 'none';
};

// Uçuş formunu gizle
const hideFlightForm = () => {
    const flightFormContainer = document.getElementById('flightFormContainer');
    const addFlightBtn = document.getElementById('addFlightBtn');
    const flightForm = document.getElementById('flightForm');
    
    if (flightFormContainer) flightFormContainer.classList.add('hidden');
    if (addFlightBtn) addFlightBtn.style.display = 'block';
    if (flightForm) flightForm.reset();
    
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
    
    const fromCityField = document.getElementById('fromCity');
    const toCityField = document.getElementById('toCity');
    const departureTimeField = document.getElementById('departureTime');
    const arrivalTimeField = document.getElementById('arrivalTime');
    const priceField = document.getElementById('price');
    const seatsTotalField = document.getElementById('seatsTotal');
    
    if (!fromCityField || !toCityField || !departureTimeField || !arrivalTimeField || !priceField || !seatsTotalField) {
        showAlert('Form alanları bulunamadı!', 'error');
        return;
    }
    
    const flightData = {
        from_city: fromCityField.value,
        to_city: toCityField.value,
        departure_time: departureTimeField.value.replace('T', ' ') + ':00',
        arrival_time: arrivalTimeField.value.replace('T', ' ') + ':00',
        price: parseFloat(priceField.value),
        seats_total: parseInt(seatsTotalField.value)
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
        await loadReservations(); // *** YENİ: Rezervasyonları da yükle ***
        setupFormEvents();
        
        // Minimum tarih olarak bugünü ayarla
        const now = new Date();
        const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const departureTimeField = document.getElementById('departureTime');
        const arrivalTimeField = document.getElementById('arrivalTime');
        
        if (departureTimeField) departureTimeField.min = minDateTime;
        if (arrivalTimeField) arrivalTimeField.min = minDateTime;
        
        // *** YENİ: Rezervasyon yenile butonu ***
        const refreshReservationsBtn = document.getElementById('refreshReservationsBtn');
        if (refreshReservationsBtn) {
            refreshReservationsBtn.addEventListener('click', refreshReservations);
        }
        
        console.log('Admin dashboard hazır');
    } catch (error) {
        console.error('Sayfa yüklenirken hata:', error);
        showAlert('Sayfa yüklenirken hata oluştu', 'error');
    }
});

// Refresh butonları
document.getElementById('refreshBookingsBtn')?.addEventListener('click', () => {
    loadFlights();
    loadReservations(); // *** YENİ: Rezervasyonları da yenile ***
    showAlert('Veriler yenilendi', 'success');
});

// *** YENİ: Global scope'ta rezervasyon fonksiyonlarını tanımla ***
window.cancelReservation = cancelReservation;
window.viewReservationDetails = viewReservationDetails;
window.closeReservationModal = closeReservationModal;