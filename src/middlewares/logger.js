const fs = require('node:fs');
const path = require('node:path');
const morgan = require('morgan');
const env = require('../config/env');

// Journal d'accès : IP, date, méthode, route, code de statut, durée.
// Ni le corps des requêtes ni l'en-tête Authorization ne sont journalisés.
const FORMAT = ':remote-addr [:date[iso]] ":method :url" :status :response-time ms';

function accessLogger() {
  if (env.isTest) return (req, res, next) => next();

  const logDir = path.resolve('logs');
  fs.mkdirSync(logDir, { recursive: true });
  const fileStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });

  return [morgan(FORMAT), morgan(FORMAT, { stream: fileStream })];
}

module.exports = accessLogger;
