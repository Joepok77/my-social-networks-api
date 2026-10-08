const { Joi, objectId, text, email, search, pagination } = require('./common');

const typeFields = {
  name: text(100),
  amount: Joi.number().min(0).max(100000).precision(2),
  quantity: Joi.number().integer().min(1).max(1000000),
};

const createType = Joi.object({
  name: typeFields.name.required(),
  amount: typeFields.amount.required(),
  quantity: typeFields.quantity.required(),
});

const updateType = Joi.object(typeFields).min(1);

const purchase = Joi.object({
  firstName: text(50).required(),
  lastName: text(50).required(),
  email: email().required(),
  address: Joi.object({
    street: text(200).required(),
    postalCode: text(20).required(),
    city: text(100).required(),
    country: text(100).required(),
  }).required(),
});

const listTickets = Joi.object({
  q: search(),
  ticketType: objectId(),
  ...pagination,
});

module.exports = { createType, updateType, purchase, listTickets };
