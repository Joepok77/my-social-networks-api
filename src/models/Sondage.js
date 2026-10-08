const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const optionSchema = new Schema({
  text: { type: String, required: true, trim: true, maxlength: 200 },
});
optionSchema.plugin(toJSON);

const questionSchema = new Schema({
  text: { type: String, required: true, trim: true, maxlength: 300 },
  options: {
    type: [optionSchema],
    validate: {
      validator: (list) => Array.isArray(list) && list.length >= 2,
      message: 'Une question doit proposer au moins deux réponses possibles',
    },
  },
});
questionSchema.plugin(toJSON);

const sondageSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (list) => Array.isArray(list) && list.length >= 1,
        message: 'Un sondage doit comporter au moins une question',
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'sondages' }
);

sondageSchema.plugin(toJSON);

module.exports = model('Sondage', sondageSchema);
