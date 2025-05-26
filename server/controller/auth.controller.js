const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Sadece USER kaydı (admin manuel eklenir)
const register = (req, res) => {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email ve password zorunludur' });
    }

    // Password uzunluk kontrolü
    if (password.length < 6) {
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Geçerli bir email adresi giriniz' });
    }

    // Email zaten var mı kontrol et
    const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
    
    db.query(checkEmailQuery, [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'Bu email adresi zaten kullanılıyor' });
        }

        // Username zaten var mı kontrol et
        const checkUsernameQuery = 'SELECT * FROM users WHERE username = ?';
        
        db.query(checkUsernameQuery, [username], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
            }

            // Şifreyi hash'le
            const salt = bcrypt.genSaltSync(10);
            const passwordHash = bcrypt.hashSync(password, salt);

            // User ID oluştur
            const user_id = 'USR' + Date.now();

            // Veritabanına ekle (sadece user rolü)
            const insertQuery = `
                INSERT INTO users (user_id, username, email, password, role) 
                VALUES (?, ?, ?, ?, 'user')
            `;
            
            const values = [user_id, username, email, passwordHash];

            db.query(insertQuery, values, (err, data) => {
                if (err) return res.status(500).json({ error: err.message });
                
                res.status(201).json({
                    message: 'Kullanıcı başarıyla kaydedildi',
                    user: {
                        user_id,
                        username,
                        email,
                        role: 'user'
                    }
                });
            });
        });
    });
};

// Giriş yapma (hem user hem admin)
// Giriş yapma (hem user hem admin için)
const login = (req, res) => {
    const { email, password } = req.body;
    
    console.log('🔍 Login attempt:', { email, password }); // Debug

    // Validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email ve password zorunludur' });
    }

    // Önce users tablosunda ara
    const findUserQuery = 'SELECT * FROM users WHERE email = ?';

    db.query(findUserQuery, [email], (err, userResults) => {
        if (err) return res.status(500).json({ error: err.message });
        
        console.log('👤 User search result:', userResults.length); // Debug
        
        if (userResults.length > 0) {
            // User bulundu
            const user = userResults[0];
            const isPasswordValid = bcrypt.compareSync(password, user.password);

            console.log('👤 User password valid:', isPasswordValid); // Debug

            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Geçersiz şifre' });
            }

            // User JWT token
            const token = jwt.sign(
                { 
                    userId: user.user_id,
                    email: user.email,
                    role: 'user'
                },
                process.env.JWT_SECRET || 'secret_key',
                { expiresIn: '24h' }
            );

            return res.status(200).json({
                message: 'Kullanıcı girişi başarılı',
                token: token,
                user: {
                    user_id: user.user_id,
                    username: user.username,
                    email: user.email,
                    role: 'user'
                }
            });
        } else {
            // User bulunamadı, admin tablosunda ara
            console.log('🔍 Searching in admin table...'); // Debug
            
            const findAdminQuery = 'SELECT * FROM admins WHERE email = ?';
            
            db.query(findAdminQuery, [email], (err, adminResults) => {
                if (err) {
                    console.log('❌ Admin query error:', err); // Debug
                    return res.status(500).json({ error: err.message });
                }
                
                console.log('⚙️ Admin search result:', adminResults.length); // Debug
                console.log('⚙️ Admin data:', adminResults); // Debug
                
                if (adminResults.length === 0) {
                    return res.status(404).json({ error: 'Email adresi bulunamadı' });
                }

                // Admin bulundu
                const admin = adminResults[0];
                const isPasswordValid = bcrypt.compareSync(password, admin.password);

                console.log('⚙️ Admin password valid:', isPasswordValid); // Debug
                console.log('⚙️ Input password:', password); // Debug
                console.log('⚙️ Stored hash:', admin.password); // Debug

                if (!isPasswordValid) {
                    return res.status(401).json({ error: 'Geçersiz şifre' });
                }

                // Admin JWT token
                const token = jwt.sign(
                    { 
                        userId: admin.admin_id,
                        email: admin.email,
                        role: 'admin'
                    },
                    process.env.JWT_SECRET || 'secret_key',
                    { expiresIn: '24h' }
                );

                return res.status(200).json({
                    message: 'Admin girişi başarılı',
                    token: token,
                    user: {
                        user_id: admin.admin_id,
                        username: admin.username,
                        email: admin.email,
                        role: 'admin'
                    }
                });
            });
        }
    });
};


// Çıkış yapma
const logout = (req, res) => {
    res.json({ message: 'Başarıyla çıkış yapıldı' });
};

// Token doğrulama
const verifyToken = (req, res) => {
    res.json({
        message: 'Token geçerli',
        user: {
            userId: req.user.userId,
            email: req.user.email,
            role: req.user.role
        }
    });
};

module.exports = {
    register,
    login,
    logout,
    verifyToken,
};