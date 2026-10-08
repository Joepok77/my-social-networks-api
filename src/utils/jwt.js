const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Algorithme imposé à la signature ET à la vérification :
// un token "alg: none" ou signé avec un autre algorithme est rejeté.
const ALGORITHM = 'HS256';

function signToken(userId) {
  return jwt.sign({}, env.jwtSecret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwtExpiresIn,
    subject: String(userId),
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
}

module.exports = { signToken, verifyToken, ALGORITHM };
