const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const createLimiter = (limit, message) =>
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(429, 'TOO_MANY_REQUESTS', message)),
  });

// Limite générale, appliquée à toute l'API.
const globalLimiter = createLimiter(
  env.rateLimit.max,
  'Trop de requêtes, réessayez plus tard'
);

// Limite stricte sur la connexion et l'inscription (force brute, création de comptes en masse).
const authLimiter = createLimiter(
  env.rateLimit.authMax,
  'Trop de tentatives, réessayez plus tard'
);

// Limite stricte sur l'achat de billets, seule route d'écriture accessible sans compte.
const purchaseLimiter = createLimiter(
  env.rateLimit.authMax,
  "Trop de tentatives d'achat, réessayez plus tard"
);

module.exports = { globalLimiter, authLimiter, purchaseLimiter };
