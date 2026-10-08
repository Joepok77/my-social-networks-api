const ApiError = require('../utils/ApiError');

// Valide params, query et body avec des schémas Joi.
// Les valeurs validées (converties, nettoyées) sont exposées dans req.valid.
// Tout champ non déclaré dans le schéma est rejeté.
const validate = (schemas) => (req, res, next) => {
  const valid = {};
  const details = [];

  for (const source of ['params', 'query', 'body']) {
    const schema = schemas[source];
    if (!schema) continue;

    const { value, error } = schema.validate(req[source] ?? {}, {
      abortEarly: false,
      convert: true,
    });
    if (error) {
      for (const detail of error.details) {
        details.push({ in: source, field: detail.path.join('.'), message: detail.message });
      }
    } else {
      valid[source] = value;
    }
  }

  if (details.length > 0) return next(ApiError.badRequest('Données invalides', details));

  req.valid = { ...req.valid, ...valid };
  return next();
};

module.exports = validate;
