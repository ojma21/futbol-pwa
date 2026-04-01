const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teamA TEXT,
      teamB TEXT,
      scoreA INTEGER,
      scoreB INTEGER
    )
  `);
});

module.exports = db;