const Joi = require('joi');
const { sanitizeText } = require('../utils/text');

const objectId = () => Joi.string().hex().length(24);

// Champ texte libre : longueur bornée et balises HTML retirées (prévention XSS).
const text = (max) =>
  Joi.string()
    .trim()
    .max(max)
    .custom((value, helpers) => {
      const clean = sanitizeText(value).trim();
      return clean.length === 0 ? helpers.error('string.empty') : clean;
    });

// Les schémas javascript: et data: sont refusés.
const url = () => Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(2048);

const email = () => Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254);

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const search = () => Joi.string().trim().max(100);

// Schéma de paramètres d'URL : chaque nom fourni doit être un ObjectId valide.
const idParams = (...names) =>
  Joi.object(Object.fromEntries(names.map((name) => [name, objectId().required()])));

const listQuery = Joi.object({ q: search(), ...pagination });

const userIdBody = Joi.object({ userId: objectId().required() });

module.exports = { Joi, objectId, text, url, email, pagination, search, idParams, listQuery, userIdBody };
