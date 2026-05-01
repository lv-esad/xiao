const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_fintech_key_for_dev';

app.use(cors());
app.use(express.json());

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            const userId = this.lastID;
            // Create default portfolio
            db.run(`INSERT INTO portfolio (user_id, eur_balance, rmb_balance) VALUES (?, 0, 0)`, [userId], (err) => {
                if (err) console.error("Error creating portfolio", err);
                
                const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '24h' });
                res.json({ token, user: { id: userId, username } });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username } });
    });
});

// --- PORTFOLIO ROUTES ---
app.get('/api/portfolio', authenticateToken, (req, res) => {
    db.all(`SELECT type, currency, amount FROM transactions WHERE user_id = ?`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        let eur_balance = 0;
        let rmb_balance = 0;
        
        (rows || []).forEach(t => {
            const amt = t.type === 'DEPOSIT' ? t.amount : -t.amount;
            if (t.currency === 'EUR') eur_balance += amt;
            else rmb_balance += amt;
        });
        
        res.json({ eur_balance, rmb_balance });
    });
});

app.put('/api/portfolio', authenticateToken, (req, res) => {
    const { eur_balance, rmb_balance } = req.body;
    db.run(
        `UPDATE portfolio SET eur_balance = ?, rmb_balance = ? WHERE user_id = ?`,
        [eur_balance, rmb_balance, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        }
    );
});

// --- TRANSACTIONS ROUTES ---
app.get('/api/transactions', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows || []);
    });
});

app.post('/api/transactions', authenticateToken, (req, res) => {
    const { type, currency, amount, rate_at_time } = req.body;
    if (!type || !currency || !amount) return res.status(400).json({ error: 'Missing fields' });

    db.run(
        `INSERT INTO transactions (user_id, type, currency, amount, rate_at_time) VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, type, currency, amount, rate_at_time || null],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ id: this.lastID, type, currency, amount, rate_at_time, created_at: new Date().toISOString() });
        }
    );
});

app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [id, req.user.id], function(delErr) {
        if (delErr) return res.status(500).json({ error: 'Failed to delete' });
        res.json({ success: true });
    });
});

app.put('/api/transactions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { type, currency, amount } = req.body;
    
    if (!type || !currency || amount === undefined) return res.status(400).json({ error: 'Missing fields' });

    db.run(
        `UPDATE transactions SET type = ?, currency = ?, amount = ? WHERE id = ? AND user_id = ?`,
        [type, currency, amount, id, req.user.id],
        function(updErr) {
            if (updErr) return res.status(500).json({ error: 'Failed to update' });
            res.json({ success: true });
        }
    );
});

// --- RATES ROUTES (Frankfurter API) ---
// We use CNY because RMB is the currency, CNY is the code used in ISO.
app.get('/api/rates/latest', async (req, res) => {
    try {
        const response = await axios.get('https://api.frankfurter.app/latest?from=EUR&to=CNY');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch rates' });
    }
});

app.get('/api/rates/history', async (req, res) => {
    // Fetch last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    try {
        const response = await axios.get(`https://api.frankfurter.app/${startDate}..${endDate}?from=EUR&to=CNY`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch historical rates' });
    }
});

// --- ALERTS ROUTES ---
app.get('/api/alerts', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM alerts WHERE user_id = ?`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows || []);
    });
});

app.post('/api/alerts', authenticateToken, (req, res) => {
    const { condition, threshold } = req.body; // condition: 'GREATER_THAN' or 'LESS_THAN'
    if (!condition || !threshold) return res.status(400).json({ error: 'Condition and threshold required' });

    db.run(
        `INSERT INTO alerts (user_id, currency_pair, condition, threshold) VALUES (?, 'EUR_RMB', ?, ?)`,
        [req.user.id, condition, threshold],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ id: this.lastID, condition, threshold });
        }
    );
});

app.delete('/api/alerts/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM alerts WHERE id = ? AND user_id = ?`, [id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});

module.exports = app;
