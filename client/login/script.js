const CONFIG = {
            API_BASE: 'http://localhost:3000',
            ENDPOINTS: {
                LOGIN: '/auth/login',
                REGISTER: '/auth/register'
            },
            ROUTES: {
                ADMIN_DASHBOARD: 'admin-dashboard.html',
                USER_HOME: 'index.html',
                REGISTER: 'register.html'
            }
        };

        // DOM Elements
        const elements = {
            loginTypeSelection: document.getElementById('loginTypeSelection'),
            userTypeBtn: document.getElementById('userTypeBtn'),
            adminTypeBtn: document.getElementById('adminTypeBtn'),
            loginForm: document.getElementById('loginForm'),
            loginTitle: document.getElementById('loginTitle'),
            backBtn: document.getElementById('backBtn'),
            emailInput: document.getElementById('email'),
            passwordInput: document.getElementById('password'),
            loginBtn: document.getElementById('loginBtn'),
            loginText: document.getElementById('loginText'),
            loginLoader: document.getElementById('loginLoader'),
            alertDiv: document.getElementById('alert'),
            registerLink: document.getElementById('registerLink')
        };

        // Global state
        let currentLoginType = null;

        // Utility Functions
        const utils = {
            // Show Alert Function
            showAlert(message, type = 'error') {
                elements.alertDiv.className = `alert alert-${type}`;
                elements.alertDiv.textContent = message;
                elements.alertDiv.classList.remove('hidden');
                
                // Auto hide after 5 seconds
                setTimeout(() => {
                    elements.alertDiv.classList.add('hidden');
                }, 5000);
            },

            // Hide Alert Function
            hideAlert() {
                elements.alertDiv.classList.add('hidden');
            },

            // Loading State
            setLoading(loading) {
                if (loading) {
                    elements.loginBtn.disabled = true;
                    elements.loginText.classList.add('hidden');
                    elements.loginLoader.classList.remove('hidden');
                } else {
                    elements.loginBtn.disabled = false;
                    elements.loginText.classList.remove('hidden');
                    elements.loginLoader.classList.add('hidden');
                }
            },

            // Email validation
            isValidEmail(email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            },

            // Remove error classes
            clearErrors() {
                elements.emailInput.classList.remove('error');
                elements.passwordInput.classList.remove('error');
            },

            // Storage functions
            setUserData(token, user) {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            },

            getUserData() {
                const token = localStorage.getItem('token');
                const user = localStorage.getItem('user');
                return {
                    token,
                    user: user ? JSON.parse(user) : null
                };
            },

            clearUserData() {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        };

        // API Functions
        const api = {
            async login(email, password) {
                const response = await fetch(`${CONFIG.API_BASE}${CONFIG.ENDPOINTS.LOGIN}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });

                return {
                    ok: response.ok,
                    data: await response.json()
                };
            }
        };

        // Auth Functions
        const auth = {
            async handleLogin(email, password) {
                utils.setLoading(true);
                utils.hideAlert();

                try {
                    const result = await api.login(email, password);

                    if (result.ok) {
                        // Başarılı giriş
                        utils.showAlert(result.data.message, 'success');
                        
                        // Token'ı localStorage'a kaydet
                        utils.setUserData(result.data.token, result.data.user);

                        // Role'e göre yönlendir
                        setTimeout(() => {
                            if (result.data.user.role === 'admin') {
                                utils.showAlert('Admin paneline yönlendiriliyorsunuz...', 'success');
                                window.location.href = '../admin/index.html'
                                console.log('Redirect to:', CONFIG.ROUTES.ADMIN_DASHBOARD);
                            } else {
                                utils.showAlert('Ana sayfaya yönlendiriliyorsunuz...', 'success');
                                window.location.href = '../user/index.html';
                                console.log('Redirect to:', CONFIG.ROUTES.USER_HOME);
                            }
                        }, 1500);

                    } else {
                        // Hata
                        utils.showAlert(result.data.error || 'Giriş başarısız');
                    }

                } catch (error) {
                    console.error('Login error:', error);
                    utils.showAlert('Bağlantı hatası. Lütfen tekrar deneyiniz.');
                } finally {
                    utils.setLoading(false);
                }
            },

            checkExistingLogin() {
                const { token, user } = utils.getUserData();
                
                if (token && user) {
                    utils.showAlert(`Zaten giriş yapmışsınız (${user.role})`, 'success');
                    
                    // Optional: Auto redirect
                    setTimeout(() => {
                        if (user.role === 'admin') {
                            console.log('Auto redirect to admin dashboard');
                            window.location.href = CONFIG.ROUTES.ADMIN_DASHBOARD;
                        } else {
                            console.log('Auto redirect to user home');
                            window.location.href = CONFIG.ROUTES.USER_HOME;
                        }
                    }, 2000);
                }
            }
        };

        // Form Validation
        const validation = {
            validateForm(email, password) {
                utils.clearErrors();

                // Basic validation
                if (!email || !password) {
                    utils.showAlert('Email ve şifre alanları zorunludur');
                    return false;
                }

                if (!utils.isValidEmail(email)) {
                    utils.showAlert('Geçerli bir email adresi giriniz');
                    elements.emailInput.classList.add('error');
                    return false;
                }

                if (password.length < 6) {
                    utils.showAlert('Şifre en az 6 karakter olmalıdır');
                    elements.passwordInput.classList.add('error');
                    return false;
                }

                return true;
            }
        };

        // UI Functions
        const ui = {
            showLoginForm(type) {
                currentLoginType = type;
                
                // Update title based on type
                if (type === 'user') {
                    elements.loginTitle.textContent = '👤 Kullanıcı Girişi';
                } else {
                    elements.loginTitle.textContent = '⚙️ Admin Girişi';
                }
                
                // Show/hide elements with animation
                elements.loginTypeSelection.classList.add('fade-out');
                
                setTimeout(() => {
                    elements.loginTypeSelection.classList.add('hidden');
                    elements.loginForm.classList.remove('hidden');
                    elements.loginForm.classList.add('fade-in');
                    elements.emailInput.focus();
                }, 300);
            },

            showTypeSelection() {
                currentLoginType = null;
                
                // Clear form
                elements.emailInput.value = '';
                elements.passwordInput.value = '';
                utils.clearErrors();
                utils.hideAlert();
                
                // Show/hide elements with animation
                elements.loginForm.classList.add('fade-out');
                
                setTimeout(() => {
                    elements.loginForm.classList.add('hidden');
                    elements.loginForm.classList.remove('fade-in');
                    elements.loginTypeSelection.classList.remove('hidden', 'fade-out');
                    elements.loginTypeSelection.classList.add('fade-in');
                }, 300);
            }
        };

        // Event Listeners
        function setupEventListeners() {
            // Login Type Selection
            elements.userTypeBtn.addEventListener('click', () => {
                ui.showLoginForm('user');
            });

            elements.adminTypeBtn.addEventListener('click', () => {
                ui.showLoginForm('admin');
            });

            // Back button
            elements.backBtn.addEventListener('click', () => {
                ui.showTypeSelection();
            });

            // Form Submit Event
            elements.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = elements.emailInput.value.trim();
                const password = elements.passwordInput.value.trim();

                if (validation.validateForm(email, password)) {
                    await auth.handleLogin(email, password);
                }
            });

            // Input event listeners for error removal
            elements.emailInput.addEventListener('input', () => {
                elements.emailInput.classList.remove('error');
            });

            elements.passwordInput.addEventListener('input', () => {
                elements.passwordInput.classList.remove('error');
            });

            // Register link
            if (elements.registerLink) {
                elements.registerLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    utils.showAlert('Kayıt sayfasına yönlendiriliyorsunuz...', 'success');
                    setTimeout(() => {
                        window.location.href = CONFIG.ROUTES.REGISTER;
                        console.log('Redirect to:', CONFIG.ROUTES.REGISTER);
                    }, 1000);
                });
            }

            // Enter key support
            document.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (!elements.loginForm.classList.contains('hidden') && !elements.loginBtn.disabled) {
                        elements.loginForm.dispatchEvent(new Event('submit'));
                    }
                }
            });

            // Escape key to go back
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !elements.loginForm.classList.contains('hidden')) {
                    ui.showTypeSelection();
                }
            });
        }

        // Initialize Application
        function init() {
            console.log('🚀 FlyTicket Login Page Initialized');
            
            // Setup event listeners
            setupEventListeners();
            
            // Check if already logged in
            auth.checkExistingLogin();
            
            // Show initial type selection
            ui.showTypeSelection();
        }

        // Start the application when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        // Export for testing (if needed)
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { auth, utils, validation, ui };
        }