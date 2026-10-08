const { Joi, text, url, search, pagination } = require('./common');
const Group = require('../models/Group');

const fields = {
  name: text(100),
  description: text(2000).allow(''),
  icon: url().allow(null),
  coverPhoto: url().allow(null),
  type: Joi.string().valid(...Group.TYPES),
  allowMembersToPost: Joi.boolean(),
  allowMembersToCreateEvents: Joi.boolean(),
};

const create = Joi.object({ ...fields, name: fields.name.required() });

const update = Joi.object(fields).min(1);

const list = Joi.object({
  q: search(),
  type: Joi.string().valid(...Group.TYPES),
  // true : uniquement les groupes dont je suis membre
  mine: Joi.boolean(),
  ...pagination,
});

module.exports = { create, update, list };
