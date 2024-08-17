const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const PORT  = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

const db = new sqlite3.Database('./chat.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database.');
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    sender TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send all existing messages to the new client
  db.all(`SELECT * FROM messages ORDER BY timestamp ASC`, [], (err, rows) => {
    if (err) {
      console.error('Error fetching messages from database:', err);
    } else {
      rows.forEach((row) => {
        ws.send(`${row.sender}: ${row.text} (${row.timestamp})`);
      });
    }
  });

  // Handle incoming messages
  ws.on('message', async (message) => {
    if (message.trim() === '') {
      console.warn('Received empty message, ignoring.');
      return;
    }

    console.log(`Received: ${message}`);

    const timestamp = new Date().toISOString();
    db.run(`INSERT INTO messages (text, sender, timestamp) VALUES (?, ?, ?)`, 
    [message, 'User', timestamp], (err) => {
      if (err) {
        console.error('Error inserting message into database:', err);
      } else {
        console.log('Message stored in database.');
      }
    });

    ws.send(`Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

process.on('SIGINT', () => {
  console.log('Closing database connection.');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
