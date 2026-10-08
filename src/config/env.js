const path = require('node:path');

require('dotenv').config({ quiet: true });

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: toInt(process.env.PORT, 3000),
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  useHttps: process.env.USE_HTTPS === 'true',
  sslKeyPath: path.resolve(process.env.SSL_KEY_PATH || 'certs/server.key'),
  sslCertPath: path.resolve(process.env.SSL_CERT_PATH || 'certs/server.crt'),
  publicAppUrl: (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 300),
    authMax: toInt(process.env.RATE_LIMIT_AUTH_MAX, 10),
  },
};

const errors = [];
if (!env.mongodbUri) errors.push('MONGODB_URI est requis');
if (!env.jwtSecret || env.jwtSecret.length < 32) {
  errors.push('JWT_SECRET est requis et doit contenir au moins 32 caractères');
}
if (env.corsOrigins.includes('*')) {
  errors.push("CORS_ORIGINS ne doit pas contenir '*' : listez explicitement les origines autorisées");
}
if (errors.length > 0) {
  throw new Error(`Configuration invalide (voir .env.example) :\n- ${errors.join('\n- ')}`);
}

module.exports = env;
