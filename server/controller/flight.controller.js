const db = require('../config/db');

const add_flight = (req, res) => {
    console.log("Gelen veri:", req.body);
    const { from_city, to_city, departure_time, arrival_time, price, seats_total } = req.body;

    // Input validation
    if (!from_city || !to_city || !departure_time || !arrival_time || !price || !seats_total) {
        return res.status(400).json({ 
            error: "Tüm alanlar zorunludur", 
            success: false 
        });
    }

    // Tarih formatı kontrolü
    const validateDate = (dateString, fieldName) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error(`${fieldName} geçersiz tarih formatında: ${dateString}`);
        }
        return date;
    };

    let departureDate, arrivalDate;
    
    try {
        departureDate = validateDate(departure_time, "Kalkış zamanı");
        arrivalDate = validateDate(arrival_time, "Varış zamanı");
    } catch (error) {
        console.error("Date validation error:", error.message);
        return res.status(400).json({ 
            error: error.message, 
            success: false 
        });
    }

    // Tarih mantık kontrolü
    if (arrivalDate <= departureDate) {
        return res.status(400).json({ 
            error: "Varış zamanı kalkış zamanından sonra olmalıdır", 
            success: false 
        });
    }

    // Şehir isminden ID bulma fonksiyonu
    const getCityIdByName = (cityName, callback) => {
        const query = "SELECT city_id FROM cities WHERE city_name = ? OR city_name LIKE ?";
        db.query(query, [cityName, `%${cityName}%`], (err, result) => {
            if (err) return callback(err, null);
            if (result.length === 0) {
                return callback(new Error(`Şehir bulunamadı: ${cityName}`), null);
            }
            callback(null, result[0].city_id);
        });
    };

    // Her iki şehir için ID'leri al
    getCityIdByName(from_city, (err, fromCityId) => {
        if (err) {
            console.error("From city error:", err);
            return res.status(400).json({ 
                error: `Kalkış şehri bulunamadı: ${from_city}`, 
                success: false 
            });
        }

        getCityIdByName(to_city, (err, toCityId) => {
            if (err) {
                console.error("To city error:", err);
                return res.status(400).json({ 
                    error: `Varış şehri bulunamadı: ${to_city}`, 
                    success: false 
                });
            }

            // Aynı şehir kontrolü
            if (fromCityId === toCityId) {
                return res.status(400).json({ 
                    error: "Kalkış ve varış şehri aynı olamaz", 
                    success: false 
                });
            }

            // Güvenli tarih işlemleri
            const departure_hour = departureDate.getHours();
            const arrival_hour = arrivalDate.getHours();
            const departure_date = departureDate.toISOString().split('T')[0];
            const arrival_date = arrivalDate.toISOString().split('T')[0];

            console.log("Tarih bilgileri:", {
                departure_hour,
                arrival_hour,
                departure_date,
                arrival_date
            });

            // Kalkış konfliktini kontrol et
            const checkDepartureConflict = `
                SELECT COUNT(*) as count 
                FROM flights 
                WHERE from_city = ? 
                AND HOUR(departure_time) = ? 
                AND DATE(departure_time) = ?
            `;

            db.query(checkDepartureConflict, [fromCityId, departure_hour, departure_date], (err, departureResult) => {
                if (err) {
                    console.error("Departure conflict check error:", err);
                    return res.status(500).json({ 
                        error: "Veritabanı hatası", 
                        success: false 
                    });
                }

                if (departureResult[0].count > 0) {
                    return res.status(409).json({ 
                        error: `${from_city} şehrinden ${departure_hour}:00 saatinde başka bir uçuş zaten mevcut`, 
                        success: false 
                    });
                }

                // Varış konfliktini kontrol et
                const checkArrivalConflict = `
                    SELECT COUNT(*) as count 
                    FROM flights 
                    WHERE to_city = ? 
                    AND HOUR(arrival_time) = ? 
                    AND DATE(arrival_time) = ?
                `;

                db.query(checkArrivalConflict, [toCityId, arrival_hour, arrival_date], (err, arrivalResult) => {
                    if (err) {
                        console.error("Arrival conflict check error:", err);
                        return res.status(500).json({ 
                            error: "Veritabanı hatası", 
                            success: false 
                        });
                    }

                    if (arrivalResult[0].count > 0) {
                        return res.status(409).json({ 
                            error: `${to_city} şehrine ${arrival_hour}:00 saatinde başka bir uçuş zaten iniyor`, 
                            success: false 
                        });
                    }

                    // Uçuş ekle
                    const insertQuery = `
                        INSERT INTO flights (from_city, to_city, departure_time, arrival_time, price, seats_total, seats_available) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `;

                    const values = [fromCityId, toCityId, departure_time, arrival_time, price, seats_total, seats_total];

                    db.query(insertQuery, values, (err, data) => {
                        if (err) {
                            console.error("Insert error:", err);
                            return res.status(500).json({ 
                                error: "Uçuş eklenirken hata oluştu", 
                                success: false 
                            });
                        }

                        res.status(201).json({ 
                            message: "Uçuş başarıyla eklendi", 
                            success: true,
                            flightId: data.insertId,
                            flight: {
                                from_city: from_city,
                                to_city: to_city,
                                departure_time: departure_time,
                                arrival_time: arrival_time,
                                price: price,
                                seats_total: seats_total
                            }
                        });
                    });
                });
            });
        });
    });
};

const getFlights = (req, res) => {
    const query = `
        SELECT 
            f.flight_id,
            f.departure_time,
            f.arrival_time,
            f.price,
            f.seats_total,
            f.seats_available,
            c1.city_name as from_city_name,
            c2.city_name as to_city_name,
            f.created_at
        FROM flights f
        JOIN cities c1 ON f.from_city = c1.city_id
        JOIN cities c2 ON f.to_city = c2.city_id
        ORDER BY f.departure_time ASC
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error("Flights fetch error:", err);
            return res.status(500).json({ 
                error: "Uçuşlar getirilirken hata oluştu", 
                success: false 
            });
        }

        res.status(200).json({ 
            flights: result,
            success: true
        });
    });
};

// Uçuş silme
const deleteFlight = (req, res) => {
    const { flightId } = req.params;

    if (!flightId) {
        return res.status(400).json({ 
            error: "Uçuş ID gerekli", 
            success: false 
        });
    }

    const deleteQuery = "DELETE FROM flights WHERE flight_id = ?";

    db.query(deleteQuery, [flightId], (err, result) => {
        if (err) {
            console.error("Delete flight error:", err);
            return res.status(500).json({ 
                error: "Uçuş silinirken hata oluştu", 
                success: false 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                error: "Uçuş bulunamadı", 
                success: false 
            });
        }

        res.status(200).json({ 
            message: "Uçuş başarıyla silindi", 
            success: true
        });
    });
};

const updateFlight = (req, res) => {
    const { flightId } = req.params;
    const { from_city, to_city, departure_time, arrival_time, price, seats_total } = req.body;

    if (!flightId) {
        return res.status(400).json({ 
            error: "Uçuş ID gerekli", 
            success: false 
        });
    }

    // Input validation
    if (!from_city || !to_city || !departure_time || !arrival_time || !price || !seats_total) {
        return res.status(400).json({ 
            error: "Tüm alanlar zorunludur", 
            success: false 
        });
    }

    // Tarih formatı kontrolü
    const validateDate = (dateString, fieldName) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error(`${fieldName} geçersiz tarih formatında: ${dateString}`);
        }
        return date;
    };

    let departureDate, arrivalDate;
    
    try {
        departureDate = validateDate(departure_time, "Kalkış zamanı");
        arrivalDate = validateDate(arrival_time, "Varış zamanı");
    } catch (error) {
        console.error("Date validation error:", error.message);
        return res.status(400).json({ 
            error: error.message, 
            success: false 
        });
    }

    // Tarih mantık kontrolü
    if (arrivalDate <= departureDate) {
        return res.status(400).json({ 
            error: "Varış zamanı kalkış zamanından sonra olmalıdır", 
            success: false 
        });
    }

    // Şehir isminden ID bulma fonksiyonu
    const getCityIdByName = (cityName, callback) => {
        const query = "SELECT city_id FROM cities WHERE city_name = ? OR city_name LIKE ?";
        db.query(query, [cityName, `%${cityName}%`], (err, result) => {
            if (err) return callback(err, null);
            if (result.length === 0) {
                return callback(new Error(`Şehir bulunamadı: ${cityName}`), null);
            }
            callback(null, result[0].city_id);
        });
    };

    // Her iki şehir için ID'leri al
    getCityIdByName(from_city, (err, fromCityId) => {
        if (err) {
            console.error("From city error:", err);
            return res.status(400).json({ 
                error: `Kalkış şehri bulunamadı: ${from_city}`, 
                success: false 
            });
        }

        getCityIdByName(to_city, (err, toCityId) => {
            if (err) {
                console.error("To city error:", err);
                return res.status(400).json({ 
                    error: `Varış şehri bulunamadı: ${to_city}`, 
                    success: false 
                });
            }

            // Aynı şehir kontrolü
            if (fromCityId === toCityId) {
                return res.status(400).json({ 
                    error: "Kalkış ve varış şehri aynı olamaz", 
                    success: false 
                });
            }

            // Önce mevcut uçuşun bilgilerini al
            const getCurrentFlightQuery = "SELECT seats_total, seats_available FROM flights WHERE flight_id = ?";
            
            db.query(getCurrentFlightQuery, [flightId], (err, currentResult) => {
                if (err) {
                    console.error("Get current flight error:", err);
                    return res.status(500).json({ 
                        error: "Veritabanı hatası", 
                        success: false 
                    });
                }

                if (currentResult.length === 0) {
                    return res.status(404).json({ 
                        error: "Uçuş bulunamadı", 
                        success: false 
                    });
                }

                const currentFlight = currentResult[0];
                const bookedSeats = currentFlight.seats_total - currentFlight.seats_available;

                // Yeni toplam koltuk sayısı rezerve edilmiş koltuktan az olamaz
                if (seats_total < bookedSeats) {
                    return res.status(400).json({ 
                        error: `Toplam koltuk sayısı rezerve edilmiş koltuk sayısından (${bookedSeats}) az olamaz`, 
                        success: false 
                    });
                }

                // Yeni available seats hesapla
                const newAvailableSeats = seats_total - bookedSeats;

                // Uçuş güncelle
                const updateQuery = `
                    UPDATE flights 
                    SET from_city = ?, to_city = ?, departure_time = ?, arrival_time = ?, 
                        price = ?, seats_total = ?, seats_available = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE flight_id = ?
                `;

                const values = [fromCityId, toCityId, departure_time, arrival_time, price, seats_total, newAvailableSeats, flightId];

                db.query(updateQuery, values, (err, updateResult) => {
                    if (err) {
                        console.error("Update flight error:", err);
                        return res.status(500).json({ 
                            error: "Uçuş güncellenirken hata oluştu", 
                            success: false 
                        });
                    }

                    if (updateResult.affectedRows === 0) {
                        return res.status(404).json({ 
                            error: "Güncellenecek uçuş bulunamadı", 
                            success: false 
                        });
                    }

                    res.status(200).json({ 
                        message: "Uçuş başarıyla güncellendi", 
                        success: true,
                        flightId: flightId,
                        flight: {
                            from_city: from_city,
                            to_city: to_city,
                            departure_time: departure_time,
                            arrival_time: arrival_time,
                            price: price,
                            seats_total: seats_total,
                            seats_available: newAvailableSeats
                        }
                    });
                });
            });
        });
    });
};

module.exports = {
    add_flight,
    getFlights,
    deleteFlight,
    updateFlight
};
