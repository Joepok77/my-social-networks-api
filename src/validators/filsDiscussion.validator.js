const { Joi, objectId, text, pagination } = require('./common');

// Exactement l'un des deux : un fil lié aux deux, ou à aucun, est refusé.
const create = Joi.object({
  group: objectId(),
  event: objectId(),
}).xor('group', 'event');

const list = Joi.object({
  group: objectId(),
  event: objectId(),
  ...pagination,
}).oxor('group', 'event');

const message = Joi.object({ content: text(2000).required() });

module.exports = { create, list, message };
