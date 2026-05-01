const fs = require('fs');
const path = require('path');
let sqlite3;
try {
    sqlite3 = require('sqlite3').verbose();
} catch (e) {
    console.error('SQLite3 native module not found, using mock database (data will not persist)');
    sqlite3 = {
        Database: function(_, cb) {
            console.log('Mock database initialized');
            if (cb) setTimeout(cb, 0);
            return {
                run: (sql, params, cb) => { if (cb) cb(null); },
                get: (sql, params, cb) => { if (cb) cb(null, null); },
                all: (sql, params, cb) => { if (cb) cb(null, []); },
                exec: (sql, params, cb) => { if (cb) cb(null); }
            };
        }
    };
}

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'database.sqlite');
const initScriptPath = path.resolve(__dirname, 'init-db.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the database.');
        if (sqlite3.verbose) initDb();
    }
});

function initDb() {
    const initSql = fs.readFileSync(initScriptPath, 'utf8');
    db.exec(initSql, (err) => {
        if (err) {
            console.error('Error executing init script:', err.message);
        } else {
            console.log('Database initialized successfully.');
        }
    });
}

module.exports = db;
