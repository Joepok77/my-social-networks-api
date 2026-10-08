const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const answerSchema = new Schema(
  {
    question: { type: Schema.Types.ObjectId, required: true },
    option: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false }
);

const reponseSondageSchema = new Schema(
  {
    poll: { type: Schema.Types.ObjectId, ref: 'Sondage', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [answerSchema], required: true },
  },
  { timestamps: true, collection: 'reponses_sondages' }
);

reponseSondageSchema.plugin(toJSON);

// Un participant ne répond qu'une seule fois à un sondage.
reponseSondageSchema.index({ poll: 1, user: 1 }, { unique: true });

module.exports = model('ReponseSondage', reponseSondageSchema);
