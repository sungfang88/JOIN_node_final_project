const mysql = require('mysql2');

const pool = mysql.createPool({
  host: '192.168.21.179',
  user: 'admin',
  password: '!QAZ@WSX',
  database: 'admin',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

module.exports = pool.promise();