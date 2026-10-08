const mongoose = require('mongoose');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');

// Vérifie le JWT transmis dans l'en-tête "Authorization: Bearer <token>".
async function authenticate(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Jeton invalide ou expiré', 'INVALID_TOKEN');
  }

  const user = mongoose.isValidObjectId(payload.sub) ? await User.findById(payload.sub) : null;
  if (!user) throw ApiError.unauthorized('Jeton invalide ou expiré', 'INVALID_TOKEN');

  req.user = user;
  next();
}

module.exports = authenticate;
