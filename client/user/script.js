// Enhanced User Dashboard Script
console.log('User Dashboard loaded');

// API Base URL
const API_BASE = 'http://localhost:3000/api'; // Port numaranıza göre ayarlayın

// Auth kontrolü
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');

if (!token || !user) {
    alert('Giriş yapmalısınız!');
    window.location.href = '../login/index.html';
}

const userData = JSON.parse(user);

// DOM Elements
const elements = {
    userName: document.getElementById('userName'),
    logoutBtn: document.getElementById('logoutBtn'),
    searchForm: document.getElementById('searchForm'),
    searchFromCity: document.getElementById('searchFromCity'),
    searchToCity: document.getElementById('searchToCity'),
    searchDate: document.getElementById('searchDate'),
    resultsSection: document.getElementById('resultsSection'),
    flightsContainer: document.getElementById('flightsContainer'),
    bookingsContainer: document.getElementById('bookingsContainer'),
    refreshBookingsBtn: document.getElementById('refreshBookingsBtn'),
    bookingModal: document.getElementById('bookingModal'),
    confirmationModal: document.getElementById('confirmationModal'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    alert: document.getElementById('alert')
};

// Global variables
let currentFlight = null;
let allFlights = [];
let cities = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

async function initializePage() {
    // Kullanıcı ismini göster
    elements.userName.textContent = `Hoş geldiniz, ${userData.username}`;
    
    // Bugünün tarihini otomatik doldur
    elements.searchDate.valueAsDate = new Date();
    
    // Event listeners
    setupEventListeners();
    
    // Verileri yükle
    await loadCities();
    await loadAllFlights(); // Tüm uçuşları direkt yükle
    await loadUserBookings();
}

function setupEventListeners() {
    // Logout butonu
    elements.logoutBtn.addEventListener('click', logout);
    
    // Search form
    elements.searchForm.addEventListener('submit', handleFlightSearch);
    
    // Refresh bookings
    elements.refreshBookingsBtn.addEventListener('click', loadUserBookings);
    
    // Modal controls
    document.getElementById('closeModalBtn').addEventListener('click', closeBookingModal);
    document.getElementById('cancelBookingBtn').addEventListener('click', closeBookingModal);
    document.getElementById('closeConfirmationBtn').addEventListener('click', closeConfirmationModal);
    
    // Booking form
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    
    // Download ticket button
    document.getElementById('downloadTicketBtn').addEventListener('click', downloadTicket);
    
    // Modal backdrop click
    elements.bookingModal.addEventListener('click', function(e) {
        if (e.target === elements.bookingModal) {
            closeBookingModal();
        }
    });
    
    elements.confirmationModal.addEventListener('click', function(e) {
        if (e.target === elements.confirmationModal) {
            closeConfirmationModal();
        }
    });
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        // HTML yanıt kontrolü
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Server returned HTML instead of JSON. Check your endpoint:', endpoint);
            throw new Error('Sunucu yanıtı beklenen formatta değil. Endpoint kontrolü yapın.');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        if (error.message.includes('Failed to fetch')) {
            showAlert('Sunucuya bağlanılamıyor. Backend çalışıyor mu?', 'error');
        } else {
            showAlert(error.message, 'error');
        }
        throw error;
    } finally {
        hideLoading();
    }
}

// Cities
async function loadCities() {
    try {
        // Önce basit cities endpoint'i deneyelim
        const response = await fetch(`${API_BASE}/cities`);
        
        if (!response.ok) {
            // Cities endpoint yoksa manuel şehir listesi kullan
            console.warn('Cities endpoint not found, using manual city list');
            cities = [
                { city_id: 1, city_name: 'İstanbul' },
                { city_id: 2, city_name: 'Ankara' },
                { city_id: 3, city_name: 'İzmir' },
                { city_id: 4, city_name: 'Antalya' },
                { city_id: 5, city_name: 'Bursa' }
            ];
        } else {
            const data = await response.json();
            cities = data.cities || data || [];
        }
        
        populateCitySelects();
    } catch (error) {
        console.error('Cities load error:', error);
        // Fallback şehir listesi
        cities = [
            { city_id: 1, city_name: 'İstanbul' },
            { city_id: 2, city_name: 'Ankara' },
            { city_id: 3, city_name: 'İzmir' },
            { city_id: 4, city_name: 'Antalya' },
            { city_id: 5, city_name: 'Bursa' }
        ];
        populateCitySelects();
    }
}

function populateCitySelects() {
    const fromSelect = elements.searchFromCity;
    const toSelect = elements.searchToCity;
    
    // Clear existing options except first
    fromSelect.innerHTML = '<option value="">Kalkış şehri seçin</option>';
    toSelect.innerHTML = '<option value="">Varış şehri seçin</option>';
    
    cities.forEach(city => {
        const cityName = city.city_name || city.name || city;
        const option1 = new Option(cityName, cityName);
        const option2 = new Option(cityName, cityName);
        
        fromSelect.appendChild(option1);
        toSelect.appendChild(option2);
    });
}

// Flights
async function loadAllFlights() {
    try {
        const response = await apiRequest('/flights');
        allFlights = response.flights || [];
        
        // Tüm uçuşları göster
        displayFlightResults(allFlights);
        elements.resultsSection.classList.remove('hidden');
        
    } catch (error) {
        console.error('Load all flights error:', error);
        elements.flightsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Uçuşlar yüklenemedi</h3>
                <p>Lütfen daha sonra tekrar deneyin veya backend sunucusunun çalıştığından emin olun.</p>
            </div>
        `;
        elements.resultsSection.classList.remove('hidden');
    }
}

// Flight Search
async function handleFlightSearch(e) {
    e.preventDefault();
    
    const fromCity = elements.searchFromCity.value;
    const toCity = elements.searchToCity.value;
    const date = elements.searchDate.value;
    
    // Filtre uygulanmamışsa tüm uçuşları göster
    let filteredFlights = [...allFlights];
    
    if (fromCity || toCity || date) {
        if (fromCity && toCity && fromCity === toCity) {
            showAlert('Kalkış ve varış şehri aynı olamaz', 'error');
            return;
        }
        
        // Filter flights
        filteredFlights = allFlights.filter(flight => {
            let matches = true;
            
            if (fromCity) {
                matches = matches && flight.from_city_name.toLowerCase().includes(fromCity.toLowerCase());
            }
            
            if (toCity) {
                matches = matches && flight.to_city_name.toLowerCase().includes(toCity.toLowerCase());
            }
            
            if (date) {
                const searchDate = new Date(date);
                const flightDate = new Date(flight.departure_time);
                matches = matches && flightDate.toDateString() === searchDate.toDateString();
            }
            
            return matches;
        });
    }
    
    displayFlightResults(filteredFlights);
}

function displayFlightResults(flights) {
    const container = elements.flightsContainer;
    
    if (flights.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✈️</div>
                <h3>Uçuş bulunamadı</h3>
                <p>Aradığınız kriterlere uygun uçuş bulunmamaktadır.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = flights.map(flight => {
        const departureTime = new Date(flight.departure_time);
        const arrivalTime = new Date(flight.arrival_time);
        
        return `
            <div class="flight-card">
                <div class="flight-header">
                    <div class="flight-route">
                        ${flight.from_city_name} → ${flight.to_city_name}
                    </div>
                    <div class="flight-price">
                        ₺${flight.price}
                    </div>
                </div>
                <div class="flight-details">
                    <div class="flight-detail">
                        <div class="flight-detail-label">Kalkış</div>
                        <div class="flight-detail-value">
                            ${departureTime.toLocaleDateString('tr-TR')} <br>
                            ${departureTime.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                        </div>
                    </div>
                    <div class="flight-detail">
                        <div class="flight-detail-label">Varış</div>
                        <div class="flight-detail-value">
                            ${arrivalTime.toLocaleDateString('tr-TR')} <br>
                            ${arrivalTime.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                        </div>
                    </div>
                    <div class="flight-detail">
                        <div class="flight-detail-label">Süre</div>
                        <div class="flight-detail-value">
                            ${calculateFlightDuration(departureTime, arrivalTime)}
                        </div>
                    </div>
                </div>
                <div class="flight-actions">
                    <div class="seats-info">
                        <span class="${flight.seats_available <= 5 ? 'seats-low' : 'seats-available'}">
                            ${flight.seats_available} koltuk mevcut
                        </span>
                    </div>
                    <button class="btn-book" 
                            onclick="openBookingModal(${flight.flight_id})" 
                            ${flight.seats_available === 0 ? 'disabled' : ''}>
                        ${flight.seats_available === 0 ? 'Dolu' : 'Rezervasyon Yap'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function calculateFlightDuration(departure, arrival) {
    const diff = arrival.getTime() - departure.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}s ${minutes}dk`;
}

// Booking Modal
async function openBookingModal(flightId) {
    try {
        const flight = allFlights.find(f => f.flight_id === flightId);
        
        if (!flight) {
            showAlert('Uçuş bulunamadı', 'error');
            return;
        }
        
        currentFlight = flight;
        
        const departureTime = new Date(flight.departure_time);
        const arrivalTime = new Date(flight.arrival_time);
        
        document.getElementById('modalFlightDetails').innerHTML = `
            <h4>${flight.from_city_name} → ${flight.to_city_name}</h4>
            <div class="flight-details">
                <div class="flight-detail">
                    <div class="flight-detail-label">Kalkış</div>
                    <div class="flight-detail-value">
                        ${departureTime.toLocaleDateString('tr-TR')} 
                        ${departureTime.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                    </div>
                </div>
                <div class="flight-detail">
                    <div class="flight-detail-label">Varış</div>
                    <div class="flight-detail-value">
                        ${arrivalTime.toLocaleDateString('tr-TR')} 
                        ${arrivalTime.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                    </div>
                </div>
                <div class="flight-detail">
                    <div class="flight-detail-label">Fiyat</div>
                    <div class="flight-detail-value">₺${flight.price}</div>
                </div>
            </div>
        `;
        
        // Pre-fill user data
        document.getElementById('passengerName').value = userData.username || '';
        document.getElementById('passengerEmail').value = userData.email || '';
        
        elements.bookingModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Open booking modal error:', error);
    }
}

function closeBookingModal() {
    elements.bookingModal.classList.add('hidden');
    currentFlight = null;
    document.getElementById('bookingForm').reset();
}

// Booking Submit
async function handleBookingSubmit(e) {
    e.preventDefault();
    
    if (!currentFlight) {
        showAlert('Uçuş bilgisi bulunamadı', 'error');
        return;
    }
    
    const passengerName = document.getElementById('passengerName').value;
    const passengerSurname = document.getElementById('passengerSurname').value;
    const passengerEmail = document.getElementById('passengerEmail').value;
    
    const fullName = `${passengerName} ${passengerSurname}`.trim();
    
    if (!fullName || !passengerEmail) {
        showAlert('Lütfen tüm alanları doldurun', 'error');
        return;
    }
    
    try {
        const bookingData = {
            flight_id: currentFlight.flight_id,
            passenger_name: fullName,
            passenger_email: passengerEmail,
            user_id: userData.user_id
        };
        
        const response = await apiRequest('/tickets', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
        
        if (response.success) {
            closeBookingModal();
            showConfirmationModal(response.ticket);
            await loadAllFlights(); // Refresh flights to update seat count
            await loadUserBookings(); // Refresh bookings
            showAlert('Bilet başarıyla rezerve edildi!', 'success');
        }
        
    } catch (error) {
        console.error('Booking submit error:', error);
    }
}

// Confirmation Modal
function showConfirmationModal(ticket) {
    const departureTime = new Date(ticket.flight_info ? ticket.flight_info.departure_time : currentFlight.departure_time);
    
    document.getElementById('ticketDetails').innerHTML = `
        <h4>🎫 E-Bilet Detayları</h4>
        <div class="ticket-info">
            <p><strong>Bilet No:</strong> #${ticket.ticket_id}</p>
            <p><strong>Yolcu:</strong> ${ticket.passenger_name}</p>
            <p><strong>Email:</strong> ${ticket.passenger_email}</p>
            <p><strong>Güzergah:</strong> ${ticket.flight_info ? ticket.flight_info.from_city + ' → ' + ticket.flight_info.to_city : currentFlight.from_city_name + ' → ' + currentFlight.to_city_name}</p>
            <p><strong>Tarih:</strong> ${departureTime.toLocaleDateString('tr-TR')}</p>
            <p><strong>Saat:</strong> ${departureTime.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</p>
            ${ticket.seat_number ? `<p><strong>Koltuk:</strong> ${ticket.seat_number}</p>` : ''}
        </div>
    `;
    
    elements.confirmationModal.classList.remove('hidden');
}

function closeConfirmationModal() {
    elements.confirmationModal.classList.add('hidden');
}

// Download Ticket
function downloadTicket() {
    showAlert('E-bilet indirme özelliği yakında eklenecek', 'success');
}

// User Bookings
async function loadUserBookings() {
    try {
        // getUserTickets endpoint'ini kullan
        const response = await fetch(`${API_BASE}/tickets/user?passenger_email=${encodeURIComponent(userData.email)}`);
        
        // HTML yanıt kontrolü
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('User tickets endpoint returned HTML instead of JSON');
            elements.bookingsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>Rezervasyon servisi geçici olarak kullanılamıyor</h3>
                    <p>Lütfen daha sonra tekrar deneyin.</p>
                </div>
            `;
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const tickets = data.tickets || [];
        
        displayUserBookings(tickets);
        
    } catch (error) {
        console.error('Load bookings error:', error);
        elements.bookingsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Rezervasyonlar yüklenemedi</h3>
                <p>Endpoint: ${API_BASE}/tickets/user kontrolü yapın.</p>
            </div>
        `;
    }
}

function displayUserBookings(tickets) {
    const container = elements.bookingsContainer;
    
    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Henüz rezervasyonunuz yok</h3>
                <p>Yukarıdan uçuş seçerek rezervasyon yapabilirsiniz.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tickets.map(ticket => {
        const departureTime = new Date(ticket.departure_time);
        const now = new Date();
        const isPastFlight = departureTime < now;
        
        return `
            <div class="booking-card">
                <div class="booking-header">
                    <div class="booking-id">Bilet #${ticket.ticket_id}</div>
                    <div class="booking-status ${isPastFlight ? 'past' : 'active'}">
                        ${isPastFlight ? 'Tamamlandı' : 'Aktif'}
                    </div>
                </div>
                <div class="booking-details">
                    <div class="booking-detail">
                        <div class="booking-detail-label">Güzergah</div>
                        <div class="booking-detail-value">
                            ${ticket.from_city} → ${ticket.to_city}
                        </div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Tarih & Saat</div>
                        <div class="booking-detail-value">
                            ${departureTime.toLocaleDateString('tr-TR')}<br>
                            ${departureTime.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                        </div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Yolcu</div>
                        <div class="booking-detail-value">
                            ${ticket.passenger_name}
                            ${ticket.seat_number ? `<br>Koltuk: ${ticket.seat_number}` : ''}
                        </div>
                    </div>
                </div>
                ${!isPastFlight ? `
                    <div class="booking-actions" style="margin-top: 1rem; text-align: right;">
                        <button class="btn-secondary" onclick="cancelBooking(${ticket.ticket_id})">
                            İptal Et
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Cancel Booking
async function cancelBooking(ticketId) {
    if (!confirm('Bu rezervasyonu iptal etmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        await apiRequest(`/tickets/${ticketId}`, {
            method: 'DELETE',
            body: JSON.stringify({
                passenger_email: userData.email
            })
        });
        
        showAlert('Rezervasyon başarıyla iptal edildi', 'success');
        await loadAllFlights(); // Refresh flights to update seat count
        await loadUserBookings(); // Refresh bookings
        
    } catch (error) {
        console.error('Cancel booking error:', error);
    }
}

// Utility Functions
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../login/index.html';
}

function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showAlert(message, type = 'success') {
    const alert = elements.alert;
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.classList.remove('hidden');
    
    setTimeout(() => {
        alert.classList.add('hidden');
    }, 5000);
}

// Make functions globally available for onclick handlers
window.openBookingModal = openBookingModal;
window.cancelBooking = cancelBooking;