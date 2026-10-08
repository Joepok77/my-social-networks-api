const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route introuvable : ${req.method} ${req.path}`));
}

// Ramène toute erreur à une ApiError pour produire un format de réponse unique.
function normalize(error) {
  if (error instanceof ApiError) return error;

  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((item) => ({
      in: 'body',
      field: item.path,
      message: item.message,
    }));
    return ApiError.badRequest('Données invalides', details);
  }
  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Valeur invalide pour le champ ${error.path}`);
  }
  // Violation d'un index unique MongoDB.
  if (error.code === 11000) {
    return ApiError.conflict('Cette ressource existe déjà', 'DUPLICATE');
  }
  // Erreurs du parseur JSON d'Express.
  if (error.type === 'entity.parse.failed') {
    return ApiError.badRequest('Corps de requête JSON invalide');
  }
  if (error.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Corps de requête trop volumineux');
  }
  return null;
}

// Les 4 paramètres sont requis pour qu'Express reconnaisse un gestionnaire d'erreurs.
function errorHandler(error, req, res, next) {
  const apiError = normalize(error);

  if (!apiError) {
    // Erreur imprévue : détail journalisé côté serveur, jamais renvoyé au client.
    if (!env.isTest) console.error(error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }

  if (apiError.status === 401) res.set('WWW-Authenticate', 'Bearer');

  const body = { code: apiError.code, message: apiError.message };
  if (apiError.details) body.details = apiError.details;
  return res.status(apiError.status).json({ error: body });
}

module.exports = { notFound, errorHandler };
