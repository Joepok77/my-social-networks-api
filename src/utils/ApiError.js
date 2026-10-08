// Erreur métier portant le code HTTP et un code applicatif stable.
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentification requise', code = 'UNAUTHORIZED') {
    return new ApiError(401, code, message);
  }

  static forbidden(message = 'Accès refusé', code = 'FORBIDDEN') {
    return new ApiError(403, code, message);
  }

  static notFound(message = 'Ressource introuvable') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, code, message);
  }
}

module.exports = ApiError;
