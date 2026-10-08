const { Joi, objectId, text, url, search, pagination } = require('./common');
const Event = require('../models/Event');

const fields = {
  name: text(100),
  description: text(5000).allow(''),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  location: text(200),
  coverPhoto: url().allow(null),
  visibility: Joi.string().valid(...Event.VISIBILITIES),
  ticketingEnabled: Joi.boolean(),
};

const userIds = (max) => Joi.array().items(objectId()).unique().max(max);

const createFields = {
  ...fields,
  name: fields.name.required(),
  startDate: fields.startDate.required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  location: fields.location.required(),
  // Le créateur est toujours ajouté aux organisateurs.
  organizers: userIds(50),
  participants: userIds(500),
};

const create = Joi.object(createFields);

const createInGroup = Joi.object({
  ...createFields,
  // true : tous les membres du groupe deviennent participants.
  inviteAllMembers: Joi.boolean().default(false),
});

// La cohérence début/fin est revérifiée par le modèle sur l'événement complet.
const update = Joi.object(fields).min(1);

const listFields = {
  q: search(),
  visibility: Joi.string().valid(...Event.VISIBILITIES),
  // Événements en cours ou à venir entre ces deux dates.
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  // true : uniquement les événements auxquels je participe
  mine: Joi.boolean(),
  ...pagination,
};

const list = Joi.object({ ...listFields, group: objectId() });

const listInGroup = Joi.object(listFields);

module.exports = { create, createInGroup, update, list, listInGroup };
