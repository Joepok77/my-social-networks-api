const { Joi, text, url, email } = require('./common');

// 72 octets : limite au-delà de laquelle bcrypt ignore les caractères.
const password = () => Joi.string().min(8).max(72);

const register = Joi.object({
  firstName: text(50).required(),
  lastName: text(50).required(),
  email: email().required(),
  password: password().required(),
  avatar: url(),
});

const login = Joi.object({
  email: email().required(),
  password: Joi.string().max(72).required(),
});

const update = Joi.object({
  firstName: text(50),
  lastName: text(50),
  email: email(),
  password: password(),
  avatar: url().allow(null),
}).min(1);

module.exports = { register, login, update };
