const { Joi, text, url } = require('./common');

const createAlbum = Joi.object({
  title: text(100).required(),
  description: text(1000).allow(''),
});

const updateAlbum = Joi.object({
  title: text(100),
  description: text(1000).allow(''),
}).min(1);

const createPhoto = Joi.object({
  url: url().required(),
  caption: text(500).allow(''),
});

const updatePhoto = Joi.object({ caption: text(500).allow('').required() });

const comment = Joi.object({ content: text(1000).required() });

module.exports = { createAlbum, updateAlbum, createPhoto, updatePhoto, comment };
