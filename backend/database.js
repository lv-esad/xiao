const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const initDb = async () => {
    try {
        const initScriptPath = path.resolve(__dirname, 'init-db.sql');
        let sql = fs.readFileSync(initScriptPath, 'utf8');
        
        // Basic conversion from SQLite to Postgres
        sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
        sql = sql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        sql = sql.replace(/CREATE TABLE IF NOT EXISTS/g, 'CREATE TABLE IF NOT EXISTS');
        
        await pool.query(sql);
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err.message);
    }
};

if (process.env.DATABASE_URL) {
    initDb();
}

module.exports = {
    // Callback style to match sqlite3 usage in server.js
    run: function(sql, params, callback) {
        // Handle optional params
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        // Convert ? to $1, $2, etc.
        let i = 0;
        const pgSql = sql.replace(/\?/g, () => `$${++i}`);
        
        // Add RETURNING id if it's an INSERT to simulate this.lastID
        const finalSql = pgSql.toLowerCase().includes('insert into') ? `${pgSql} RETURNING id` : pgSql;

        pool.query(finalSql, params, (err, res) => {
            if (err) {
                if (callback) callback(err);
                return;
            }
            // Simulate sqlite3's 'this' context for lastID
            const context = { lastID: res.rows && res.rows[0] ? res.rows[0].id : null };
            if (callback) callback.call(context, null);
        });
    },

    get: function(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        let i = 0;
        const pgSql = sql.replace(/\?/g, () => `$${++i}`);
        pool.query(pgSql, params, (err, res) => {
            if (err) {
                if (callback) callback(err);
                return;
            }
            if (callback) callback(null, res.rows[0]);
        });
    },

    all: function(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        let i = 0;
        const pgSql = sql.replace(/\?/g, () => `$${++i}`);
        pool.query(pgSql, params, (err, res) => {
            if (err) {
                if (callback) callback(err);
                return;
            }
            if (callback) callback(null, res.rows);
        });
    }
};
