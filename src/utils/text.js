const { FilterXSS } = require('xss');

// Aucune balise autorisée : les balises sont retirées, le contenu des <script> et <style> aussi.
const filter = new FilterXSS({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
});

const sanitizeText = (value) => filter.process(value);

// Neutralise les métacaractères avant d'utiliser une saisie dans une expression régulière.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchRegex = (value) => new RegExp(escapeRegex(value), 'i');

module.exports = { sanitizeText, escapeRegex, searchRegex };
