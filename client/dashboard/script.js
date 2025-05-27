        // Configuration
        const CONFIG = {
            API_BASE: 'http://localhost:3000/api'
        };

        // Global variables
        let cities = [];
        let flights = [];
        let currentUser = null;

        // Utility functions
        const showAlert = (message, type = 'info') => {
            const alert = document.getElementById('alert');
            alert.textContent = message;
            alert.className = `alert ${type}`;
            alert.classList.remove('hidden');
            
            setTimeout(() => {
                alert.classList.add('hidden');
            }, 5000);
        };

        const setLoading = (show) => {
            const loading = document.getElementById('loadingSection');
            const results = document.getElementById('resultsSection');
            const noResults = document.getElementById('noResults');
            
            if (show) {
                loading.classList.remove('hidden');
                results.classList.add('hidden');
                noResults.classList.add('hidden');
            } else {
                loading.classList.add('hidden');
            }
        };

        // API functions
        const apiCall = async (endpoint, options = {}) => {
            try {
                const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
                    headers: {
                        'Content-Type': 'application/json',
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

        // Load cities
        const loadCities = async () => {
            try {
                const data = await apiCall('/cities');
                cities = data.cities;
                
                const fromSelect = document.getElementById('fromCity');
                const toSelect = document.getElementById('toCity');
                
                fromSelect.innerHTML = '<option value="">Nereden</option>';
                toSelect.innerHTML = '<option value="">Nereye</option>';
                
                cities.forEach(city => {
                    const option1 = new Option(city.city_name, city.city_name);
                    const option2 = new Option(city.city_name, city.city_name);
                    fromSelect.add(option1);
                    toSelect.add(option2);
                });
                
            } catch (error) {
                console.error('Şehirler yüklenemedi:', error);
                showAlert('Şehirler yüklenirken hata oluştu', 'error');
            }
        };

        // Search flights
        const searchFlights = async (fromCity, toCity, departureDate) => {
            try {
                setLoading(true);
                const data = await apiCall(`/flights?from=${fromCity}&to=${toCity}&date=${departureDate}`);
                flights = data.flights || [];
                displayFlights();
            } catch (error) {
                console.error('Uçuş arama hatası:', error);
                showAlert('Uçuş aranırken hata oluştu', 'error');
                showNoResults();
            } finally {
                setLoading(false);
            }
        };

        // Display flights
        const displayFlights = () => {
            const container = document.getElementById('flightsContainer');
            const resultsSection = document.getElementById('resultsSection');
            const noResults = document.getElementById('noResults');
            const resultsTitle = document.getElementById('resultsTitle');
            const resultsInfo = document.getElementById('resultsInfo');
            
            if (flights.length === 0) {
                showNoResults();
                return;
            }
            
            resultsTitle.textContent = `${flights.length} Uçuş Bulundu`;
            resultsInfo.textContent = `En uygun fiyatlı uçuşları listelen below`;
            
            const flightsHTML = flights.map(flight => {
                const departureTime = new Date(flight.departure_time).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const arrivalTime = new Date(flight.arrival_time).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const duration = calculateDuration(flight.departure_time, flight.arrival_time);
                const seatsLeft = flight.seats_available;
                const isLimited = seatsLeft <= 5;
                
                return `
                    <div class="flight-card">
                        <div class="flight-info">
                            <div class="route-info">
                                <div class="city-name">${flight.from_city_name}</div>
                                <div class="route-time">${departureTime}</div>
                            </div>
                            
                            <div class="route-visual">
                                <div class="route-line"></div>
                            </div>
                            
                            <div class="route-info">
                                <div class="city-name">${flight.to_city_name}</div>
                                <div class="route-time">${arrivalTime}</div>
                            </div>
                            
                            <div class="duration">
                                <div>Uçuş Süresi</div>
                                <div>${duration}</div>
                            </div>
                            
                            <div class="price-book">
                                <div class="price">₺${flight.price.toLocaleString('tr-TR')}</div>
                                ${isLimited ? `<div class="seats-left">Sadece ${seatsLeft} koltuk kaldı!</div>` : ''}
                                <button class="btn-book" onclick="bookFlight(${flight.flight_id})">
                                    Rezervasyon Yap
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = flightsHTML;
            resultsSection.classList.remove('hidden');
            noResults.classList.add('hidden');
        };

        // Show no results
        const showNoResults = () => {
            const resultsSection = document.getElementById('resultsSection');
            const noResults = document.getElementById('noResults');
            
            resultsSection.classList.add('hidden');
            noResults.classList.remove('hidden');
        };

        // Calculate duration
        const calculateDuration = (departure, arrival) => {
            const dep = new Date(departure);
            const arr = new Date(arrival);
            const diffMs = arr - dep;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            return `${diffHours}s ${diffMinutes}dk`;
        };

        // Book flight
        const bookFlight = (flightId) => {
            if (!currentUser) {
                if (confirm('Rezervasyon yapmak için giriş yapmalısınız. Giriş sayfasına yönlendirilmek ister misiniz?')) {
                    // Rezervasyon bilgisini session'a kaydet
                    sessionStorage.setItem('pendingFlightId', flightId);
                    window.location.href = './login/index.html';
                }
                return;
            }
            
            // Kullanıcı girişi yapmışsa rezervasyon sayfasına yönlendir
            window.location.href = `user/booking.html?flight=${flightId}`;
        };

        // Check authentication
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            if (token && user) {
                currentUser = JSON.parse(user);
                updateNavigation();
            }
        };

        // Update navigation
        const updateNavigation = () => {
            const guestNav = document.getElementById('guestNav');
            const userNav = document.getElementById('userNav');
            const userWelcome = document.getElementById('userWelcome');
            
            if (currentUser) {
                guestNav.classList.add('hidden');
                userNav.classList.remove('hidden');
                userWelcome.textContent = `Hoş geldiniz, ${currentUser.username}!`;
            } else {
                guestNav.classList.remove('hidden');
                userNav.classList.add('hidden');
            }
        };

        // Logout
        const logout = () => {
            if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                currentUser = null;
                updateNavigation();
                showAlert('Başarıyla çıkış yapıldı', 'success');
            }
        };

        // Event listeners
        document.getElementById('searchForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fromCity = document.getElementById('fromCity').value;
            const toCity = document.getElementById('toCity').value;
            const departureDate = document.getElementById('departureDate').value;
            
            if (!fromCity || !toCity || !departureDate) {
                showAlert('Lütfen tüm alanları doldurun', 'error');
                return;
            }
            
            if (fromCity === toCity) {
                showAlert('Kalkış ve varış şehri aynı olamaz', 'error');
                return;
            }
            
            await searchFlights(fromCity, toCity, departureDate);
        });

        document.getElementById('logoutBtn').addEventListener('click', logout);

        // Set minimum date to today
        document.getElementById('departureDate').min = new Date().toISOString().split('T')[0];

        // Initialize
        document.addEventListener('DOMContentLoaded', async () => {
            checkAuth();
            await loadCities();
            
            // Check for pending flight booking
            const pendingFlightId = sessionStorage.getItem('pendingFlightId');
            if (pendingFlightId && currentUser) {
                sessionStorage.removeItem('pendingFlightId');
                window.location.href = `user/booking.html?flight=${pendingFlightId}`;
            }
        });

        // Global functions
        window.bookFlight = bookFlight;
