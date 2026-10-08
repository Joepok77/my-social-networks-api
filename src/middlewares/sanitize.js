const ApiError = require('../utils/ApiError');

const FORBIDDEN_KEY = /[$.]/;
const MAX_DEPTH = 10;

function hasForbiddenKey(value, depth = 0) {
  if (value === null || typeof value !== 'object') return false;
  if (depth > MAX_DEPTH) return true;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenKey(item, depth + 1));
  return Object.keys(value).some(
    (key) => FORBIDDEN_KEY.test(key) || hasForbiddenKey(value[key], depth + 1)
  );
}

// Protection contre l'injection NoSQL : refuse toute clé contenant '$' ou '.'
// (opérateurs MongoDB comme $ne, $gt, $where) dans le corps ou la query string.
function rejectMongoOperators(req, res, next) {
  if (hasForbiddenKey(req.body) || hasForbiddenKey(req.query)) {
    return next(ApiError.badRequest("Noms de champs invalides : '$' et '.' sont interdits"));
  }
  return next();
}

module.exports = rejectMongoOperators;
