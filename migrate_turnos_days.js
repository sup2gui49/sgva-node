const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'sgva.db');
const db = new Database(dbPath);

console.log('Migrating turnos table to include dias_semana...');

try {
    // Add dias_semana column if not exists
    const cols = db.prepare('PRAGMA table_info(turnos)').all();
    if (!cols.find(c => c.name === 'dias_semana')) {
        db.prepare("ALTER TABLE turnos ADD COLUMN dias_semana TEXT DEFAULT '[1,2,3,4,5]'").run();
        console.log('Column dias_semana added.');
    } else {
        console.log('Column dias_semana already exists.');
    }
} catch (error) {
    console.error('Error migrating:', error);
}

db.close();
