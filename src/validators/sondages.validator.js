const { Joi, objectId, text } = require('./common');

const option = Joi.object({ text: text(200).required() });

const question = Joi.object({
  text: text(300).required(),
  // Au moins deux réponses possibles par question.
  options: Joi.array().items(option).min(2).max(20).required(),
});

const questions = () => Joi.array().items(question).min(1).max(50);

const create = Joi.object({
  title: text(200).required(),
  questions: questions().required(),
});

const update = Joi.object({
  title: text(200),
  questions: questions(),
}).min(1);

// Une seule réponse par question : deux entrées sur la même question sont refusées.
const respond = Joi.object({
  answers: Joi.array()
    .items(Joi.object({ question: objectId().required(), option: objectId().required() }))
    .min(1)
    .unique('question')
    .required(),
});

module.exports = { create, update, respond };
