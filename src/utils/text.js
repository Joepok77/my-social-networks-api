const { FilterXSS } = require('xss');

// Aucune balise autorisée :
// - une vraie balise (<b>, </a>, <img ...>) est retirée, ainsi que le contenu des <script> et <style> ;
// - un chevron isolé (« prix < 10 ») n'est pas une balise : il est encodé (&lt;), sans perte de texte.
// Le résultat ne contient donc jamais de chevron brut.
const filter = new FilterXSS({
  whiteList: {},
  stripIgnoreTagBody: ['script', 'style'],
  onIgnoreTag: (tag, html) => (/^<[a-zA-Z/!?]/.test(html) ? '' : undefined),
});

const sanitizeText = (value) => filter.process(value);

// Neutralise les métacaractères avant d'utiliser une saisie dans une expression régulière.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchRegex = (value) => new RegExp(escapeRegex(value), 'i');

module.exports = { sanitizeText, escapeRegex, searchRegex };
