const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const photoSchema = new Schema(
  {
    album: { type: Schema.Types.ObjectId, ref: 'Album', required: true, index: true },
    // Dupliqué depuis l'album pour vérifier les droits sans jointure.
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true },
    caption: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

photoSchema.plugin(toJSON);

module.exports = model('Photo', photoSchema);
