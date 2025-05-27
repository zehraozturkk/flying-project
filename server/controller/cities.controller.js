
const db = require('../config/db');

// Tüm şehirleri getir
const getCities = (req, res) => {
    const query = `
        SELECT city_id, city_name 
        FROM cities 
        ORDER BY city_name ASC
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error("Cities fetch error:", err);
            return res.status(500).json({ 
                error: "Şehirler getirilirken hata oluştu", 
                success: false 
            });
        }

        res.status(200).json({ 
            cities: result,
            success: true
        });
    });
};

module.exports = {
    getCities,
};