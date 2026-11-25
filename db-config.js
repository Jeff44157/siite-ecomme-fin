require('dotenv').config();

function enabled(value) {
  const text = String(value == null ? '' : value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(text);
}

function dbConfig(database, extra) {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: database || process.env.DB_NAME || 'ecommerce'
  };

  if (enabled(process.env.DB_SSL)) {
    const ca = process.env.DB_SSL_CA;
    config.ssl = ca ? { ca: String(ca).replace(/\\n/g, '\n') } : { rejectUnauthorized: false };
  }

  return { ...config, ...(extra || {}) };
}

module.exports = { dbConfig };
