const cors = require('cors');
const env = require('../config/env');

// Seules les origines listées dans CORS_ORIGINS reçoivent l'en-tête Access-Control-Allow-Origin.
// L'authentification passe par l'en-tête Authorization (pas de cookie) : credentials reste à false,
// et '*' est refusé au démarrage (voir config/env.js).
module.exports = cors({
  origin(origin, callback) {
    // Pas d'en-tête Origin : client non navigateur (curl, Postman), non concerné par CORS.
    if (!origin) return callback(null, false);
    return callback(null, env.corsOrigins.includes(origin));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});
