const db = require('../config/db');

// Bilet oluşturma
const createTicket = (req, res) => {
    console.log("Gelen veri:", req.body);
    const { flight_id, seat_number } = req.body;
    
    // Local storage'dan kullanıcı bilgilerini al (frontend'den gönderilmeli)
    const { passenger_name, passenger_email, user_id } = req.body;

    // Input validation
    if (!flight_id || !passenger_name || !passenger_email) {
        return res.status(400).json({ 
            error: "Uçuş ID, yolcu adı ve email zorunludur", 
            success: false 
        });
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(passenger_email)) {
        return res.status(400).json({ 
            error: "Geçersiz email formatı", 
            success: false 
        });
    }

    // Önce uçuşun var olup olmadığını ve müsait koltuk olup olmadığını kontrol et
    const checkFlightQuery = `
        SELECT flight_id, seats_available, 
               DATE_FORMAT(departure_time, '%Y-%m-%d %H:%i') as departure_time,
               c1.city_name as from_city,
               c2.city_name as to_city
        FROM flights f
        JOIN cities c1 ON f.from_city = c1.city_id
        JOIN cities c2 ON f.to_city = c2.city_id
        WHERE f.flight_id = ?
    `;

    db.query(checkFlightQuery, [flight_id], (err, flightResult) => {
        if (err) {
            console.error("Flight check error:", err);
            return res.status(500).json({ 
                error: "Veritabanı hatası", 
                success: false 
            });
        }

        if (flightResult.length === 0) {
            return res.status(404).json({ 
                error: "Uçuş bulunamadı", 
                success: false 
            });
        }

        const flight = flightResult[0];

        if (flight.seats_available <= 0) {
            return res.status(400).json({ 
                error: "Bu uçuşta müsait koltuk bulunmamaktadır", 
                success: false 
            });
        }

        // Eğer koltuk numarası belirtildiyse, o koltuğun dolu olup olmadığını kontrol et
        if (seat_number) {
            const checkSeatQuery = "SELECT COUNT(*) as count FROM tickets WHERE flight_id = ? AND seat_number = ?";
            
            db.query(checkSeatQuery, [flight_id, seat_number], (err, seatResult) => {
                if (err) {
                    console.error("Seat check error:", err);
                    return res.status(500).json({ 
                        error: "Veritabanı hatası", 
                        success: false 
                    });
                }

                if (seatResult[0].count > 0) {
                    return res.status(409).json({ 
                        error: `${seat_number} numaralı koltuk zaten rezerve edilmiş`, 
                        success: false 
                    });
                }

                // Bilet oluştur
                createTicketRecord();
            });
        } else {
            // Koltuk numarası belirtilmediyse direkt bilet oluştur
            createTicketRecord();
        }

        function createTicketRecord() {
            // Bilet ekle
            const insertTicketQuery = `
                INSERT INTO tickets (passenger_name, passenger_email, flight_id, seat_number) 
                VALUES (?, ?, ?, ?)
            `;

            const ticketValues = [passenger_name, passenger_email, flight_id, seat_number || null];

            db.query(insertTicketQuery, ticketValues, (err, ticketData) => {
                if (err) {
                    console.error("Insert ticket error:", err);
                    return res.status(500).json({ 
                        error: "Bilet oluşturulurken hata oluştu", 
                        success: false 
                    });
                }

                // Uçuştaki müsait koltuk sayısını azalt
                const updateSeatsQuery = "UPDATE flights SET seats_available = seats_available - 1 WHERE flight_id = ?";

                db.query(updateSeatsQuery, [flight_id], (err, updateResult) => {
                    if (err) {
                        console.error("Update seats error:", err);
                        // Bilet oluşturuldu ama koltuk sayısı güncellenemedi, rollback yapılabilir
                        return res.status(500).json({ 
                            error: "Bilet oluşturuldu ancak koltuk sayısı güncellenemedi", 
                            success: false 
                        });
                    }

                    res.status(201).json({ 
                        message: "Bilet başarıyla oluşturuldu", 
                        success: true,
                        ticketId: ticketData.insertId,
                        ticket: {
                            ticket_id: ticketData.insertId,
                            passenger_name: passenger_name,
                            passenger_email: passenger_email,
                            flight_id: flight_id,
                            seat_number: seat_number,
                            flight_info: {
                                from_city: flight.from_city,
                                to_city: flight.to_city,
                                departure_time: flight.departure_time
                            }
                        }
                    });
                });
            });
        }
    });
};

// Kullanıcının biletlerini getirme
const getUserTickets = (req, res) => {
    const { passenger_email } = req.query;

    if (!passenger_email) {
        return res.status(400).json({ 
            error: "Email adresi gerekli", 
            success: false 
        });
    }

    const query = `
        SELECT 
            t.ticket_id,
            t.passenger_name,
            t.passenger_email,
            t.seat_number,
            t.created_at,
            f.flight_id,
            DATE_FORMAT(f.departure_time, '%Y-%m-%d %H:%i') as departure_time,
            DATE_FORMAT(f.arrival_time, '%Y-%m-%d %H:%i') as arrival_time,
            f.price,
            c1.city_name as from_city,
            c2.city_name as to_city
        FROM tickets t
        JOIN flights f ON t.flight_id = f.flight_id
        JOIN cities c1 ON f.from_city = c1.city_id
        JOIN cities c2 ON f.to_city = c2.city_id
        WHERE t.passenger_email = ?
        ORDER BY f.departure_time ASC
    `;

    db.query(query, [passenger_email], (err, result) => {
        if (err) {
            console.error("Get user tickets error:", err);
            return res.status(500).json({ 
                error: "Biletler getirilirken hata oluştu", 
                success: false 
            });
        }

        res.status(200).json({ 
            tickets: result,
            success: true
        });
    });
};

// Tüm biletleri getirme (admin için)
const getAllTickets = (req, res) => {
    const query = `
        SELECT 
            t.ticket_id,
            t.passenger_name,
            t.passenger_email,
            t.seat_number,
            t.created_at,
            f.flight_id,
            DATE_FORMAT(f.departure_time, '%Y-%m-%d %H:%i') as departure_time,
            DATE_FORMAT(f.arrival_time, '%Y-%m-%d %H:%i') as arrival_time,
            f.price,
            c1.city_name as from_city,
            c2.city_name as to_city
        FROM tickets t
        JOIN flights f ON t.flight_id = f.flight_id
        JOIN cities c1 ON f.from_city = c1.city_id
        JOIN cities c2 ON f.to_city = c2.city_id
        ORDER BY t.created_at DESC
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error("Get all tickets error:", err);
            return res.status(500).json({ 
                error: "Biletler getirilirken hata oluştu", 
                success: false 
            });
        }

        res.status(200).json({ 
            tickets: result,
            success: true
        });
    });
};

// Bilet iptal etme
// ticket.controller.js - Callback tabanlı MySQL için

const cancelTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        if (!ticketId) {
            return res.status(400).json({
                success: false,
                error: 'Bilet ID gerekli'
            });
        }

        // Promise wrapper fonksiyonu
        const queryAsync = (sql, params) => {
            return new Promise((resolve, reject) => {
                db.query(sql, params, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
        };

        // Önce bileti bul
        const findTicketQuery = `
            SELECT t.*, f.seats_available, f.seats_total 
            FROM tickets t 
            JOIN flights f ON t.flight_id = f.flight_id 
            WHERE t.ticket_id = ?
        `;
        
        const ticketResult = await queryAsync(findTicketQuery, [ticketId]);
        
        if (!ticketResult || ticketResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Bilet bulunamadı'
            });
        }

        const ticket = ticketResult[0];
        
        // Bileti sil
        const cancelQuery = `DELETE FROM tickets WHERE ticket_id = ?`;
        const cancelResult = await queryAsync(cancelQuery, [ticketId]);
        
        if (cancelResult.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bilet iptal edilemedi'
            });
        }

        // Uçuştaki müsait koltuk sayısını artır
        const updateSeatsQuery = `
            UPDATE flights 
            SET seats_available = seats_available + 1 
            WHERE flight_id = ? AND seats_available < seats_total
        `;
        await queryAsync(updateSeatsQuery, [ticket.flight_id]);

        res.json({
            success: true,
            message: 'Bilet başarıyla iptal edildi',
            ticket_id: ticketId
        });

    } catch (error) {
        console.error('Bilet iptal hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Bilet iptal edilirken bir hata oluştu: ' + error.message
        });
    }
};

// Belirli bir uçuşun biletlerini getirme
const getFlightTickets = (req, res) => {
    const { flightId } = req.params;

    if (!flightId) {
        return res.status(400).json({ 
            error: "Uçuş ID gerekli", 
            success: false 
        });
    }

    const query = `
        SELECT 
            t.ticket_id,
            t.passenger_name,
            t.passenger_email,
            t.seat_number,
            t.created_at
        FROM tickets t
        WHERE t.flight_id = ?
        ORDER BY t.seat_number ASC, t.created_at ASC
    `;

    db.query(query, [flightId], (err, result) => {
        if (err) {
            console.error("Get flight tickets error:", err);
            return res.status(500).json({ 
                error: "Uçuş biletleri getirilirken hata oluştu", 
                success: false 
            });
        }

        res.status(200).json({ 
            tickets: result,
            flight_id: flightId,
            success: true
        });
    });
};

module.exports = {
    createTicket,
    getUserTickets,
    getAllTickets,
    cancelTicket,
    getFlightTickets
};